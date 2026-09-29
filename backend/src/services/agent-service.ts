import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import prompts from '../agent/prompts';
import characterResponseTool from '../agent/tools/character-response-tool';
import conversationMoodTool from '../agent/tools/conversation-mood';
import { InternalServerError, ValidationError } from '../errors/api-error';
import {
  Character,
  CharacterResponse,
  ConversationContext,
  ConversationMood,
  Mood,
} from '../schema';

const CharacterResponseSchema: z.ZodType<CharacterResponse> = z.object({
  character: z.enum(Character),
  response: z.string(),
  reasoning: z.string(),
  floorToUser: z.boolean(),
});

const ConversationMoodSchema: z.ZodType<ConversationMood> = z.object({
  reasoning: z.string(),
  mood: z.enum(Mood),
  intensity: z.number().int().min(1).max(5),
});

export default class AgentService {
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

  async getConversationMood({
    messages,
    summary,
  }: ConversationContext): Promise<ConversationMood> {
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

    const parsedResult = ConversationMoodSchema.safeParse(toolUse.input);

    if (parsedResult.error) {
      throw new ValidationError(
        [`Validation failed: ${parsedResult.error.message}`],
        422
      );
    }

    return parsedResult.data;
  }

  async *streamModeratorRound(
    { messages, summary }: ConversationContext,
    signal?: AbortSignal
  ): AsyncGenerator<CharacterResponse> {
    const stream = this.anthropic.messages.stream(
      {
        model: this.model,
        system: this.compactConversation(prompts.ROUND, summary),
        messages: [
          ...messages.map(({ author, message }) => ({
            role:
              author !== 'user' ? ('assistant' as const) : ('user' as const),
            content: message,
          })),
          {
            role: 'user' as const,
            content:
              'Play the next round: continue the conversation line by line until a moment naturally turns the floor toward the user, then stop.',
          },
        ],
        max_tokens: this.maxTokens,
        tool_choice: { type: 'any' },
        tools: [characterResponseTool],
      },
      { signal }
    );

    const buffers = new Map<number, string>();

    for await (const event of stream) {
      switch (event.type) {
        case 'content_block_start': {
          if (event.content_block.type === 'tool_use') {
            buffers.set(event.index, '');
          }
          break;
        }
        case 'content_block_delta': {
          if (event.delta.type === 'input_json_delta') {
            const buffered = buffers.get(event.index);
            if (buffered === undefined) break;
            buffers.set(event.index, buffered + event.delta.partial_json);
          }
          break;
        }
        case 'content_block_stop': {
          const raw = buffers.get(event.index);

          if (raw === undefined) break;

          buffers.delete(event.index);

          let block: unknown;
          try {
            block = JSON.parse(raw);
          } catch {
            console.error(
              'Discarding line block with malformed JSON (truncated?)'
            );
            break;
          }

          const parsed = CharacterResponseSchema.safeParse(block);
          if (parsed.error) {
            throw new ValidationError(
              [`Validation failed: ${parsed.error.message}`],
              422
            );
          }
          yield parsed.data;
          break;
        }
      }
    }

    if (buffers.size > 0) {
      console.error(
        `Round truncated mid-line: discarding ${buffers.size} incomplete block(s). Likely hit max_tokens`
      );
    }
  }

  async summarizeConversation({
    messages,
    summary,
  }: ConversationContext): Promise<string> {
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
          content: `Existing summary:\n${summary ?? 'None yet.'}\n\nNew messages:\n${transcript}`,
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
