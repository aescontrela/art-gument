import { SQL } from 'sql-template-strings';
import DbPool from '../db';
import { NotFoundError } from '../errors/api-error';
import { CreateMessageInput, GetMessageByIdInput, Message } from '../schema';

export default class MessageRepository {
  constructor(private db = new DbPool()) {}

  async create({
    author,
    message,
    threadId,
  }: CreateMessageInput): Promise<Message> {
    const { rows } = await this.db.query(
      SQL`
        INSERT INTO message (author, content, thread_id)
        VALUES (
          ${author},
          ${message},
          ${threadId}
        )
        RETURNING
          id,
          author,
          content as message,
          thread_id as "threadId",
          created_at as "createdAt";`
    );

    return rows[0];
  }

  async getById({ id }: GetMessageByIdInput): Promise<Message> {
    const { rows } = await this.db.query(
      SQL`
        SELECT
          id,
          author,
          content as message,
          thread_id AS "threadId",
          created_at AS "createdAt"
        FROM message
        WHERE id = ${id};`
    );

    const result = rows[0];

    if (!result) {
      throw new NotFoundError(`Chat message could not be found.`);
    }

    return result;
  }
}
