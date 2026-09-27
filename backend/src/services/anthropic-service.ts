import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import prompts from '../agent/prompts';
import characterResponseTool from '../agent/tools/character-response-tool';
import { InternalServerError, ValidationError } from '../errors/api-error';
import { Message } from '../repositories/message-repository';
import { Character } from '../schema';

type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

const CharacterResponseSchema = z.object({
  character: z.enum(Character),
  response: z.string(),
});

type CharacterResponse = z.infer<typeof CharacterResponseSchema>;

export default class AnthropicService {
  private readonly anthropic: Anthropic;
  private readonly model = 'claude-opus-5';
  private readonly maxTokens = 8000;

  constructor() {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new InternalServerError(
        'Unavailable service',
        'Anthropic API key not found',
        500
      );
    }

    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
      logLevel: 'error',
    });
  }

  private compactConversation(
    systemPrompt: string,
    summary?: string | null
  ): string {
    if (!summary) {
      return systemPrompt;
    }

    return `${systemPrompt}\n\n<conversation_summary>\n${summary}\n</conversation_summary>`;
  }

  async getCharacterTurn(
    conversationHistory: ChatMessage[] = [],
    character: Character,
    summary?: string | null
  ): Promise<CharacterResponse[]> {
    return await this._generateTurn({
      conversationHistory,
      systemPrompt: this.compactConversation(prompts.SINGLE_CHARACTER, summary),
      newMessage: {
        role: 'user',
        content: `${character} speaks next. Respond as ${character}.`,
      },
    });
  }

  async getModeratorTurn(
    conversationHistory: ChatMessage[] = [],
    summary?: string | null
  ): Promise<CharacterResponse[]> {
    const response = await this._generateTurn({
      conversationHistory,
      systemPrompt: this.compactConversation(prompts.NEXT_CHARACTER, summary),
      newMessage: {
        role: 'user',
        content:
          'Choose the next speaker — a different character than whoever spoke last — and respond as them.',
      },
    });

    return response;
  }

  async summarizeConversation({
    existingSummary,
    messages,
  }: {
    existingSummary: string | null;
    messages: Pick<Message, 'author' | 'message'>[];
  }): Promise<string> {
    const transcript = messages
      .map(({ author, message }) => `${author}: ${message}`)
      .join('\n');

    const results = await this.anthropic.messages.create({
      model: 'claude-sonnet-5',
      system: prompts.SUMMARIZE,
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: `Existing summary:\n${existingSummary ?? 'None yet.'}\n\nNew messages:\n${transcript}`,
        },
      ],
    });

    const text = results.content.find(block => block.type === 'text');

    if (!text) {
      throw new InternalServerError(
        'Service temporarily unavailable',
        'Anthropic API returned no summary text',
        503
      );
    }

    return text.text.trim();
  }

  private async _generateTurn({
    newMessage,
    conversationHistory = [],
    systemPrompt,
  }: {
    newMessage: ChatMessage;
    conversationHistory?: ChatMessage[];
    systemPrompt?: string;
  }): Promise<CharacterResponse[]> {
    const results = await this.anthropic.messages.create({
      model: this.model,
      system: systemPrompt,
      messages: [...conversationHistory, newMessage],
      max_tokens: this.maxTokens,
      stream: false,
      tool_choice: { type: 'any' },
      tools: [characterResponseTool],
    });

    if (!results.content.length) {
      throw new InternalServerError(
        'Service temporarily unavailable',
        'Anthropic API returned no content',
        503
      );
    }

    const parsedResults = z.array(CharacterResponseSchema).safeParse(
      results.content
        .filter(x => x.type === 'tool_use')
        .flatMap(x => {
          if (x.type === 'tool_use' && 'input' in x) {
            return Array.isArray(x.input) ? x.input : [x.input];
          }
          return [];
        })
    );

    if (parsedResults.error) {
      throw new ValidationError(
        [`Validation failed: ${parsedResults.error.message}`],
        422
      );
    }

    return parsedResults.data;
  }
}
