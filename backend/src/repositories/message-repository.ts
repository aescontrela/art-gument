import { SQL } from 'sql-template-strings';
import DbPool from '../db';
import { NotFoundError } from '../errors/api-error';
import { Author } from '../schema';

export type Message = {
  id: string;
  author: Author;
  message: string;
  threadId: number;
};

export default class MessageRepository {
  constructor(private db = new DbPool()) {}

  async create({
    author,
    message,
    threadId,
  }: Pick<Message, 'author' | 'message' | 'threadId'>): Promise<string> {
    const { rows } = await this.db.query(
      SQL`
        INSERT INTO message (author, content, thread_id) 
        VALUES (
          ${author},
          ${message},
          ${threadId}
        )
        RETURNING id;`
    );

    const result = rows[0];

    if (!result) {
      throw new NotFoundError(`Chat message could not be saved.`);
    }

    return result.id;
  }
}
