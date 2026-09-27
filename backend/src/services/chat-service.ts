import { NotFoundError } from '../errors/api-error';
import MessageRepository from '../repositories/message-repository';
import ThreadRepository from '../repositories/thread-repository';
import { Character } from '../schema';
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

    return thread.messages;
  }

  async generateMessageAs(input: { threadId: number; character: Character }) {
    await this.compactHistory(input.threadId);

    const { summary, messages: recentMessages } = await this.getThreadById(
      input.threadId,
      THREAD_WINDOW
    );

    const turn = await this.anthropicService.getCharacterTurn(
      recentMessages.map(({ author, message }) => ({
        role: author !== 'user' ? 'assistant' : 'user',
        content: message,
      })),
      input.character,
      summary
    );

    const { messages } = await this.updateThreadTurn({
      threadId: input.threadId,
      turn,
    });

    return messages;
  }

  async generateModeratorTurn(input: { threadId: number }) {
    await this.compactHistory(input.threadId);

    const { summary, messages: recentMessages } = await this.getThreadById(
      input.threadId,
      THREAD_WINDOW
    );

    const turn = await this.anthropicService.getModeratorTurn(
      recentMessages.map(({ author, message }) => ({
        role: author !== 'user' ? 'assistant' : 'user',
        content: message,
      })),
      summary
    );

    const { messages } = await this.updateThreadTurn({
      threadId: input.threadId,
      turn,
    });

    return messages;
  }
}
