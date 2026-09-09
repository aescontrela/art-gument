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
        `Summarization failed for thread ${threadId}; continuing with stale summary`,
        err
      );
    }
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

    const updatedThread = await this.getThreadById(input.threadId);

    return updatedThread.messages;
  }

  async generateCharacterMessage(input: {
    threadId: number;
    character: Character;
  }) {
    await this.compactHistory(input.threadId);

    const thread = await this.getThreadById(input.threadId, THREAD_WINDOW);

    const results = await this.anthropicService.getCharacterResponse(
      thread.messages.map(({ author, message }) => ({
        role: author !== 'user' ? 'assistant' : 'user',
        content: message,
      })),
      input.character,
      thread.summary
    );

    for (const result of results) {
      await this.messageRepository.create({
        threadId: input.threadId,
        author: result.character,
        message: result.response,
      });
    }

    const updatedThread = await this.getThreadById(input.threadId);

    return updatedThread.messages;
  }

  async generateNextCharacterMessage(input: { threadId: number }) {
    await this.compactHistory(input.threadId);

    const thread = await this.getThreadById(input.threadId, THREAD_WINDOW);

    const results = await this.anthropicService.getNextCharacterResponse(
      thread.messages.map(({ author, message }) => ({
        role: author !== 'user' ? 'assistant' : 'user',
        content: message,
      })),
      thread.summary
    );

    for (const result of results) {
      await this.messageRepository.create({
        threadId: input.threadId,
        author: result.character,
        message: result.response,
      });
    }

    const updatedThread = await this.getThreadById(input.threadId);

    return updatedThread.messages;
  }
}
