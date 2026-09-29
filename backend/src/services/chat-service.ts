import { APIError, NotFoundError } from '../errors/api-error';
import MessageRepository from '../repositories/message-repository';
import ThreadRepository from '../repositories/thread-repository';
import { CharacterResponse, ChatMessage, Mood } from '../schema';
import AgentService from './agent-service';

export type RoundEvent =
  | { type: 'line'; line: CharacterResponse }
  | { type: 'mood'; mood: { mood: Mood; intensity: number } | null };

const THREAD_WINDOW = 10;
const SUMMARY_CHUNK_SIZE = 10;

export default class ChatService {
  private readonly activeThreads = new Set<number>();

  constructor(
    private readonly messageRepository = new MessageRepository(),
    private readonly threadRepository = new ThreadRepository(),
    private readonly agentService = new AgentService()
  ) {}

  private async compactHistory(threadId: number): Promise<void> {
    const { summary, messages: overflow } =
      await this.threadRepository.getThreadOverflow({
        threadId,
        windowSize: THREAD_WINDOW,
      });

    if (overflow.length < SUMMARY_CHUNK_SIZE) {
      return;
    }

    try {
      const newSummary = await this.agentService.summarizeConversation({
        summary,
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
      const { mood, intensity } = await this.agentService.getConversationMood({
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

  async createThread() {
    return await this.threadRepository.create();
  }

  async getThreadById(threadId: number, limit?: number) {
    const thread = await this.threadRepository.getById({ threadId, limit });

    if (!thread) {
      throw new NotFoundError(`Thread ${threadId} not found`);
    }

    return thread;
  }

  async runUserTurn(input: { threadId: number; message: string }) {
    await this.getThreadById(input.threadId);

    await this.messageRepository.create({
      author: 'user',
      threadId: input.threadId,
      message: input.message,
    });

    const thread = await this.getThreadById(input.threadId);

    return { messages: thread.messages, mood: null };
  }

  async *runModeratorRound(input: {
    threadId: number;
    signal?: AbortSignal;
  }): AsyncGenerator<RoundEvent> {
    if (this.activeThreads.has(input.threadId)) {
      throw new APIError(
        `A round is already in progress for thread ${input.threadId}`,
        409
      );
    }

    this.activeThreads.add(input.threadId);

    try {
      await this.compactHistory(input.threadId);

      const { summary, messages: recentMessages } = await this.getThreadById(
        input.threadId,
        THREAD_WINDOW
      );

      const round = this.agentService.streamModeratorRound(
        { messages: recentMessages, summary },
        input.signal
      );

      const newLines: ChatMessage[] = [];

      for await (const line of round) {
        await this.messageRepository.create({
          threadId: input.threadId,
          author: line.character,
          message: line.response,
        });

        newLines.push({ author: line.character, message: line.response });

        yield { type: 'line', line };
      }

      const mood = await this.refreshMood({
        threadId: input.threadId,
        summary,
        messages: [...recentMessages, ...newLines].slice(-THREAD_WINDOW),
      });

      yield { type: 'mood', mood };
    } finally {
      this.activeThreads.delete(input.threadId);
    }
  }
}
