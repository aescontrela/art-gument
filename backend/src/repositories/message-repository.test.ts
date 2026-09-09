import { SQL } from 'sql-template-strings';
import DB from '../db';
import { NotFoundError } from '../errors/api-error';
import { Character } from '../schema';
import MessageRepository from './message-repository';

const input = {
  author: Character.BASQUIAT,
  message: 'Everybody sells something.',
};

describe('MessageRepository', () => {
  const db = new DB();
  const messageRepository = new MessageRepository();

  beforeEach(async () => {
    await db.query(SQL`TRUNCATE thread, message RESTART IDENTITY CASCADE;`);
  });

  afterAll(async () => {
    await db.close();
  });

  test('creates a message on an existing thread', async () => {
    const { rows } = await db.query(
      SQL`INSERT INTO thread DEFAULT VALUES RETURNING id;`
    );

    const messageId = await messageRepository.create({
      author: input.author,
      message: input.message,
      threadId: rows[0].id,
    });

    expect(messageId).toBeDefined();
  });

  test('select a message by id', async () => {
    const { rows } = await db.query(
      SQL`INSERT INTO thread DEFAULT VALUES RETURNING id;`
    );

    const messageId = await messageRepository.create({
      author: input.author,
      message: input.message,
      threadId: rows[0].id,
    });

    const message = await messageRepository.getById(messageId);

    expect(message).toMatchObject({
      id: messageId,
      author: input.author,
      message: input.message,
      threadId: rows[0].id,
    });
  });

  test('throws not found error when message not found', async () => {
    await db.query(SQL`INSERT INTO thread DEFAULT VALUES RETURNING id;`);

    await expect(
      messageRepository.getById('00000000-0000-0000-0000-000000000000')
    ).rejects.toThrow(NotFoundError);
  });
});
