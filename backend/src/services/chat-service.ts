import { NotFoundError } from '../errors/api-error';
import MessageRepository from '../repositories/message-repository';
import ThreadRepository from '../repositories/thread-repository';
import { Character } from '../schema';

export default class ChatService {
  constructor(
    private readonly messageRepository = new MessageRepository(),
    private readonly threadRepository = new ThreadRepository()
  ) {}

  private async validateAndGetThread(threadId: number) {
    const thread = await this.threadRepository.getById(threadId);

    if (!thread) {
      throw new NotFoundError(`Thread ${threadId} not found`);
    }

    return thread;
  }

  async createThread() {
    return await this.threadRepository.create();
  }

  async getThread(threadId: number) {
    return await this.validateAndGetThread(threadId);
  }

  async processUserMessage(input: { threadId: number; message: string }) {
    await this.validateAndGetThread(input.threadId);

    await this.messageRepository.create({
      author: 'user',
      threadId: input.threadId,
      message: input.message,
    });

    const updatedThread = await this.validateAndGetThread(input.threadId);

    return updatedThread.messages;
  }

  async generateCharacterMessage(input: {
    threadId: number;
    character: Character;
  }) {
    console.log('NOT IMPLEMENTED YET', input);
  }

  async generateNextCharacterMessage(input: { threadId: number }) {
    console.log('NOT IMPLEMENTED YET', input);
  }
}
