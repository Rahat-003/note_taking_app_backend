// npm run bootstrap: loads permission.json, role.json and user.json into MongoDB.
import 'reflect-metadata';
import { container } from '../src/container';
import { AppConfig } from '../src/config/AppConfig';
import { Database } from '../src/database/Database';
import { Bootstrapper } from './Bootstrapper';

async function main(): Promise<void> {
  const database = container.resolve(Database);
  await database.connect(container.resolve(AppConfig).mongoUri);
  try {
    const r = await container.resolve(Bootstrapper).run();
    console.log(`Bootstrap done: ${r.permissions} permissions synced, ${r.roles} roles and ${r.users} users created`);
  } finally {
    await database.disconnect();
  }
}

main().catch((err: Error) => {
  console.error(err.message);
  process.exit(1);
});
