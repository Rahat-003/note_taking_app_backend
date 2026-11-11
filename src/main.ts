import 'reflect-metadata';
import { container } from './container';
import { createApp } from './app';
import { AppConfig } from './config/AppConfig';
import { Database } from './database/Database';
import { Migrator } from './database/Migrator';

async function main(): Promise<void> {
  const config = container.resolve(AppConfig);
  await container.resolve(Database).connect(config.mongoUri);

  const pending = await container.resolve(Migrator).pending();
  if (pending.length) throw new Error(`Pending migrations: ${pending.join(', ')}. Run "npm run setup" first.`);

  createApp().listen(config.port, () => console.log(`API listening on http://localhost:${config.port}`));
}

main().catch((err: Error) => {
  console.error('Failed to start:', err.message);
  process.exit(1);
});
