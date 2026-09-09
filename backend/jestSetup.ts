import * as dotenv from 'dotenv';
import DB from './src/db';

export default async () => {
  dotenv.config({ path: '.env.test', override: true });
  const db = new DB();
  try {
    await db.migrate();
  } finally {
    await db.close();
  }
};
