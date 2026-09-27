import { NotFoundError } from '../errors/api-error';
import MessageRepository from '../repositories/message-repository';
import ThreadRepository from '../repositories/thread-repository';
import { Character, ChatMessage, Mood } from '../schema';
import AnthropicService from './anthropic-service';

const THREAD_WINDOW = 10;
const SUMMARY_CHUNK_SIZE = 10;

export default class ChatService {
  constructor(
    private readonly messageRepository = new MessageRepository(),
    private readonly threadRepository = new ThreadRepository(),
    private readonly anthropicService = new AnthropicService()
  ) {}

  private async compactHistory(threadId: number): Promise<void> {
    const { summary, messages: overflow } =
      await this.threadRepository.getThreadOverflow(threadId, THREAD_WINDOW);

    if (overflow.length < SUMMARY_CHUNK_SIZE) {
      return;
    }

    try {
      const newSummary = await this.anthropicService.summarizeConversation({
        existingSummary: summary,
        messages: overflow,
      });

      await this.threadRepository.updateSummary({
        id: threadId,
        summary: newSummary,
        summarizedUntil: overflow[overflow.length - 1].createdAt,
      });
    } catch (err) {
      console.error(
        `Compact history failed for thread ${threadId}; continuing with stale summary`,
        err
      );
    }
  }

  private async refreshMood({
    threadId,
    summary,
    messages,
  }: {
    threadId: number;
    summary: string | null;
    messages: ChatMessage[];
  }): Promise<{ mood: Mood; intensity: number } | null> {
    try {
      const { mood, intensity } =
        await this.anthropicService.getConversationMood({
          summary,
          messages,
        });

      await this.threadRepository.updateMood({ id: threadId, mood, intensity });

      return { mood, intensity };
    } catch (err) {
      console.error(
        `Mood refresh failed for thread ${threadId}; continuing with stale mood`,
        err
      );
      return null;
    }
  }

  private async updateThreadTurn(input: {
    threadId: number;
    turn: { character: Character; response: string }[];
  }) {
    for (const { character, response } of input.turn) {
      await this.messageRepository.create({
        threadId: input.threadId,
        author: character,
        message: response,
      });
    }

    const thread = await this.getThreadById(input.threadId);

    return thread;
  }

  private async runTurn(
    threadId: number,
    generate: (
      recentMessages: ChatMessage[],
      summary: string | null
    ) => Promise<{ character: Character; response: string }[]>
  ) {
    await this.compactHistory(threadId);

    const { summary, messages: recentMessages } = await this.getThreadById(
      threadId,
      THREAD_WINDOW
    );

    const turn = await generate(recentMessages, summary);

    const { messages } = await this.updateThreadTurn({ threadId, turn });

    const mood = await this.refreshMood({
      threadId,
      summary,
      messages: messages.slice(-THREAD_WINDOW),
    });

    return { messages, mood };
  }

  async createThread() {
    return await this.threadRepository.create();
  }

  async getThreadById(threadId: number, limit?: number) {
    const thread = await this.threadRepository.getById(threadId, limit);

    if (!thread) {
      throw new NotFoundError(`Thread ${threadId} not found`);
    }

    return thread;
  }

  async processUserMessage(input: { threadId: number; message: string }) {
    await this.getThreadById(input.threadId);

    await this.messageRepository.create({
      author: 'user',
      threadId: input.threadId,
      message: input.message,
    });

    const thread = await this.getThreadById(input.threadId);

    return { messages: thread.messages, mood: null };
  }

  async generateMessageAs(input: { threadId: number; character: Character }) {
    return await this.runTurn(input.threadId, (recentMessages, summary) =>
      this.anthropicService.getCharacterTurn(
        recentMessages,
        input.character,
        summary
      )
    );
  }

  async generateModeratorTurn(input: { threadId: number }) {
    return await this.runTurn(input.threadId, (recentMessages, summary) =>
      this.anthropicService.getModeratorTurn(recentMessages, summary)
    );
  }
}
