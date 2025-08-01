import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import prompts from '../agent/prompts';
import characterResponseTool from '../agent/tools/character-response-tool';
import { InternalServerError, ValidationError } from '../errors/api-error';
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
  private readonly model = 'claude-3-5-sonnet-20240620';
  private readonly maxTokens = 1000;

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

  async getCharacterResponse(
    conversationHistory: ChatMessage[] = [],
    character: Character
  ): Promise<CharacterResponse[]> {
    return await this._generateCharacterResponse({
      conversationHistory,
      systemPrompt: prompts.SINGLE_CHARACTER,
      newMessage: {
        role: 'assistant',
        content: `${character} responds`,
      },
    });
  }

  async getNextCharacterResponse(
    conversationHistory: ChatMessage[] = []
  ): Promise<CharacterResponse[]> {
    const response = await this._generateCharacterResponse({
      conversationHistory,
      systemPrompt: prompts.NEXT_CHARACTER,
      newMessage: {
        role: 'assistant',
        content: `IMPORTANT: Select a DIFFERENT character than the last speaker.`,
      },
    });

    return response;
  }

  private async _generateCharacterResponse({
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
