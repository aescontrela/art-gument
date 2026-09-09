import { SQL } from 'sql-template-strings';
import DbPool from '../db';
import { NotFoundError } from '../errors/api-error';
import { Message } from './message-repository';

type Thread = {
  id: number;
  summary: string | null;
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

  async updateSummary({
    id,
    summary,
    summarizedUntil,
  }: {
    id: number;
    summary: string;
    summarizedUntil: Date;
  }): Promise<string> {
    const { rows } = await this.db.query(
      SQL`
        UPDATE thread SET
          summary = ${summary},
          summarized_until = ${summarizedUntil}
        WHERE id = ${id}
        RETURNING id;`
    );

    if (rows.length === 0) {
      throw new NotFoundError(`Thread could not be updated.`);
    }

    return rows[0].id;
  }

  async getById(threadId: number, limit?: number): Promise<Thread> {
    const thread = await this.db.query(
      SQL`
        SELECT id, summary FROM thread WHERE id = ${threadId};`
    );

    if (!thread.rows.length) {
      throw new NotFoundError(`Not found thread with id ${threadId}`);
    }

    const query = SQL`
        SELECT id, author, message, "threadId", "createdAt"
        FROM (
          SELECT
            m.id,
            m.author,
            m.content AS message,
            m.thread_id AS "threadId",
            m.created_at AS "createdAt"
          FROM message m
          WHERE m.thread_id = ${threadId}
          ORDER BY m.created_at DESC`;

    if (limit !== undefined) {
      query.append(SQL`
          LIMIT ${limit}`);
    }

    query.append(SQL`
        ) recent
        ORDER BY "createdAt" ASC;`);

    const { rows } = await this.db.query(query);

    return { id: threadId, summary: thread.rows[0].summary, messages: rows };
  }

  async getThreadOverflow(
    threadId: number,
    windowSize: number
  ): Promise<Thread> {
    const thread = await this.db.query(
      SQL`
        SELECT id, summary FROM thread WHERE id = ${threadId};`
    );

    if (!thread.rows.length) {
      throw new NotFoundError(`Not found thread with id ${threadId}`);
    }

    const { rows } = await this.db.query(
      SQL`
        SELECT
          overflow.id,
          overflow.author,
          overflow.message,
          overflow.thread_id as "threadId",
          overflow.created_at as "createdAt"
        FROM (
          SELECT
            m.id,
            m.author,
            m.content AS message,
            m.thread_id,
            m.created_at
          FROM thread t
          JOIN message m ON m.thread_id = t.id
          WHERE t.id = ${threadId}
            AND m.created_at > COALESCE(t.summarized_until, '-infinity')
          ORDER BY m.created_at DESC
          OFFSET ${windowSize}
        ) overflow
        ORDER BY overflow.created_at ASC;`
    );

    return { id: threadId, summary: thread.rows[0].summary, messages: rows };
  }
}
