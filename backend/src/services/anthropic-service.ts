import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import prompts from '../agent/prompts';
import characterResponseTool from '../agent/tools/character-response-tool';
import conversationMoodTool from '../agent/tools/conversation-mood';
import { InternalServerError, ValidationError } from '../errors/api-error';
import { ChatMessage, Character, Mood } from '../schema';

const CharacterResponseSchema = z.object({
  character: z.enum(Character),
  response: z.string(),
});

type CharacterResponse = z.infer<typeof CharacterResponseSchema>;

const MoodResponseSchema = z.object({
  reasoning: z.string(),
  mood: z.enum(Mood),
  intensity: z.number().int().min(1).max(5),
});

type MoodResponse = z.infer<typeof MoodResponseSchema>;

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

  private async generateTurn({
    instruction,
    conversationHistory = [],
    systemPrompt,
  }: {
    instruction: string;
    conversationHistory?: ChatMessage[];
    systemPrompt?: string;
  }): Promise<CharacterResponse[]> {
    const results = await this.anthropic.messages.create({
      model: this.model,
      system: systemPrompt,
      messages: [
        ...conversationHistory.map(({ author, message }) => ({
          role: author !== 'user' ? ('assistant' as const) : ('user' as const),
          content: message,
        })),
        { role: 'user' as const, content: instruction },
      ],
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

  async getConversationMood({
    messages,
    summary,
  }: {
    messages: ChatMessage[];
    summary?: string | null;
  }): Promise<MoodResponse> {
    const transcript = messages
      .map(({ author, message }) => `${author}: ${message}`)
      .join('\n');

    const results = await this.anthropic.messages.create({
      model: 'claude-sonnet-5',
      system: this.compactConversation(prompts.MOOD, summary),
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: `Recent messages:\n${transcript}`,
        },
      ],
      tool_choice: { type: 'tool', name: 'detect_conversation_mood' },
      tools: [conversationMoodTool],
    });

    const toolUse = results.content.find(block => block.type === 'tool_use');

    if (!toolUse) {
      throw new InternalServerError(
        'Service temporarily unavailable',
        'Anthropic API returned no mood reading',
        503
      );
    }

    const parsedResult = MoodResponseSchema.safeParse(toolUse.input);

    if (parsedResult.error) {
      throw new ValidationError(
        [`Validation failed: ${parsedResult.error.message}`],
        422
      );
    }

    return parsedResult.data;
  }

  async getCharacterTurn(
    conversationHistory: ChatMessage[] = [],
    character: Character,
    summary?: string | null
  ): Promise<CharacterResponse[]> {
    return await this.generateTurn({
      conversationHistory,
      systemPrompt: this.compactConversation(prompts.SINGLE_CHARACTER, summary),
      instruction: `${character} speaks next. Respond as ${character}.`,
    });
  }

  async getModeratorTurn(
    conversationHistory: ChatMessage[] = [],
    summary?: string | null
  ): Promise<CharacterResponse[]> {
    const response = await this.generateTurn({
      conversationHistory,
      systemPrompt: this.compactConversation(prompts.NEXT_CHARACTER, summary),
      instruction:
        'Choose the next speaker — a different character than whoever spoke last — and respond as them.',
    });

    return response;
  }

  async summarizeConversation({
    existingSummary,
    messages,
  }: {
    existingSummary: string | null;
    messages: ChatMessage[];
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
}
