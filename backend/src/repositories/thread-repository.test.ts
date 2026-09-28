import { SQL } from 'sql-template-strings';
import DB from '../db';
import { NotFoundError } from '../errors/api-error';
import { Character } from '../schema';
import MessageRepository from './message-repository';
import ThreadRepository from './thread-repository';

describe('ThreadRepository', () => {
  const db = new DB();
  const threadRepository = new ThreadRepository();
  const messageRepository = new MessageRepository();

  beforeEach(async () => {
    await db.query(SQL`TRUNCATE thread, message RESTART IDENTITY CASCADE;`);
  });

  afterAll(async () => {
    await db.close();
  });

  test('creates a thread', async () => {
    const threadId = await threadRepository.create();
    expect(threadId).toBeDefined();
  });

  test('updates thread summary', async () => {
    const threadId = await threadRepository.create();
    const result = await threadRepository.updateSummary({
      id: threadId,
      summary: 'Lorem',
      summarizedUntil: new Date(),
    });

    expect(result).toBeDefined();
  });

  test('selects thread by id', async () => {
    const threadId = await threadRepository.create();
    const result = await threadRepository.getById({ threadId });
    expect(result).toMatchObject({
      id: threadId,
      summary: null,
      messages: [],
    });
  });

  test('selects thread by id supports messages limit', async () => {
    const threadId = await threadRepository.create();
    for (const message of ['one', 'two', 'three']) {
      await messageRepository.create({
        author: Character.BASQUIAT,
        message,
        threadId,
      });
    }

    const result = await threadRepository.getById({ threadId, limit: 2 });

    expect(result.messages.map(({ message }) => message)).toEqual([
      'two',
      'three',
    ]);
  });

  test('throws not found error when thrad not found', async () => {
    await expect(threadRepository.getById({ threadId: 3 })).rejects.toThrow(
      NotFoundError
    );
  });
});
