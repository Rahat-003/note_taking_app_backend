// npm run migrate            apply pending migrations
// npm run migrate -- status  list applied and pending migrations
// npm run migrate -- down    revert the last applied migration
import 'reflect-metadata';
import { container } from '../container';
import { AppConfig } from '../config/AppConfig';
import { Database } from '../database/Database';
import { Migrator } from '../database/Migrator';

async function main(command = 'up'): Promise<void> {
  const database = container.resolve(Database);
  const migrator = container.resolve(Migrator);
  await database.connect(container.resolve(AppConfig).mongoUri, container.resolve(AppConfig).mongoScriptPool);
  try {
    if (command === 'up') {
      const ran = await migrator.migrate();
      console.log(ran.length ? `Applied: ${ran.join(', ')}` : 'Nothing to migrate');
    } else if (command === 'down') {
      const reverted = await migrator.rollback();
      console.log(reverted ? `Reverted: ${reverted}` : 'Nothing to revert');
    } else if (command === 'status') {
      for (const name of await migrator.applied()) console.log(`applied  ${name}`);
      for (const name of await migrator.pending()) console.log(`pending  ${name}`);
    } else {
      throw new Error(`Unknown command "${command}" (use up, down or status)`);
    }
  } finally {
    await database.disconnect();
  }
}

main(process.argv[2]).catch((err: Error) => {
  console.error(err.message);
  process.exit(1);
});
