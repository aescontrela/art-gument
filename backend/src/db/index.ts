import { promises as fsPromises } from 'fs';
import path from 'path';
import { DatabaseError as pgDatabaseError, Pool, QueryResult } from 'pg';
import SQL, { SQLStatement } from 'sql-template-strings';
import { InternalServerError } from '../errors/api-error';

export default class DB {
  private static pool: Pool;

  constructor() {
    DB.pool = new Pool({
      user: process.env.DB_USER,
      host: process.env.DB_HOST,
      database: process.env.DB_NAME,
      password: process.env.DB_PASSWORD,
      port: Number(process.env.DB_PORT),
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
  }

  async query(query: SQLStatement): Promise<QueryResult> {
    let client;
    try {
      client = await DB.pool.connect();
      const result = await client.query(query);
      return result;
    } catch (err) {
      throw new InternalServerError(
        'Database operation failed',
        `${err instanceof Error ? err.message : err}`
      );
    } finally {
      if (client) {
        client.release();
      }
    }
  }

  async migrate() {
    let client;
    const dir = path.resolve(__dirname, '../db/migrations');
    const files = await fsPromises.readdir(dir);

    try {
      client = await DB.pool.connect();

      await client.query(SQL`
        CREATE TABLE IF NOT EXISTS migrations (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) NOT NULL UNIQUE,
            created_at TIMESTAMP NOT NULL DEFAULT NOW()
        );`);

      const { rows } = await client.query(SQL`SELECT name from migrations;`);

      const appliedMigrations = rows.map(row => row.name);

      const pendingMigrations = files.filter(
        file => !appliedMigrations.includes(file)
      );

      for (const file of pendingMigrations) {
        try {
          const statement = await fsPromises.readFile(
            path.join(dir, file),
            'utf8'
          );
          await DB.pool.query(statement);
          await DB.pool.query(
            SQL`INSERT INTO migrations (name) VALUES (${file});`
          );
        } catch (e) {
          if (e instanceof pgDatabaseError) {
            throw new InternalServerError(
              'Database operation failed',
              `Migration Failed: ${file}, ${e.message}`
            );
          } else {
            throw new InternalServerError(
              'Database operation failed',
              `Migration Failed: ${file}`
            );
          }
        }
      }
    } finally {
      if (client) {
        client.release();
      }
    }
  }

  async seed() {
    let client;
    const dir = path.resolve(__dirname, '../db/seeders');
    const files = await fsPromises.readdir(dir);

    try {
      client = await DB.pool.connect();

      await client.query(SQL`
        CREATE TABLE IF NOT EXISTS seeders (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) NOT NULL UNIQUE,
            created_at TIMESTAMP NOT NULL DEFAULT NOW()
        );`);

      const { rows } = await client.query(SQL`SELECT name from seeders;`);

      const appliedSeeders = rows.map(row => row.name);

      const pendingSeeders = files.filter(
        file => !appliedSeeders.includes(file)
      );

      for (const file of pendingSeeders) {
        try {
          const statement = await fsPromises.readFile(
            path.join(dir, file),
            'utf8'
          );
          await DB.pool.query(statement);
          await DB.pool.query(
            SQL`INSERT INTO seeders (name) VALUES (${file});`
          );
        } catch (e) {
          throw new InternalServerError(
            'Database operation failed',
            `Seeder Failed: ${file}, ${e instanceof pgDatabaseError ? e.message : 'Unknown error'}`
          );
        }
      }
    } finally {
      if (client) {
        client.release();
      }
    }
  }
}
