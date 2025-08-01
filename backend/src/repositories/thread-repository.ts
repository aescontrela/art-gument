import { SQL } from 'sql-template-strings';
import DbPool from '../db';
import { NotFoundError } from '../errors/api-error';
import { Message } from './message-repository';

type Thread = {
  id: number;
  messages: Message[];
};

export default class ThreadRepository {
  constructor(private db = new DbPool()) {}

  async create(): Promise<Thread['id']> {
    const { rows } = await this.db.query(
      SQL`
        INSERT INTO thread DEFAULT VALUES
        RETURNING id;`
    );

    if (!rows.length) {
      throw new NotFoundError(`Thread could not be created.`);
    }

    return rows[0].id;
  }

  async getById(threadId: number): Promise<Thread> {
    const thread = await this.db.query(
      SQL`
        SELECT id FROM thread WHERE id = ${threadId};`
    );

    if (!thread.rows.length) {
      throw new NotFoundError(`Not found thread with id ${threadId}`);
    }

    const { rows } = await this.db.query(
      SQL`
        SELECT
          m.id,
          m.author,
          m.content AS message
        FROM thread t
        JOIN message m ON t.id = m.thread_id
        WHERE t.id = ${threadId};`
    );

    return { id: threadId, messages: rows };
  }
}
