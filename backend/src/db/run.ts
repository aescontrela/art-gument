import 'dotenv/config';
import DB from './index';

async function main() {
  const command = process.argv[2];

  if (command !== 'migrate' && command !== 'seed') {
    console.error('Usage: yarn migrate | yarn seed');
    process.exit(1);
  }

  const db = new DB();

  try {
    if (command === 'migrate') {
      await db.migrate();
      console.log('Migrations applied');
    } else {
      await db.seed();
      console.log('Seed data applied');
    }
  } finally {
    await db.close();
  }
}

main().catch(err => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
