import 'reflect-metadata';
import { container } from './container';
import { createApp } from './app';
import { AppConfig } from './config/AppConfig';
import { Database } from './database/Database';
import { Migrator } from './database/Migrator';

async function main(): Promise<void> {
  const config = container.resolve(AppConfig);
  const database = container.resolve(Database);
  await database.connect(config.mongoUri, config.mongoPool);
  const { maxPoolSize, minPoolSize } = config.mongoPool;
  console.log(`MongoDB connected (pool ${minPoolSize}–${maxPoolSize} connections)`);

  const pending = await container.resolve(Migrator).pending();
  if (pending.length) throw new Error(`Pending migrations: ${pending.join(', ')}. Run "npm run setup" first.`);

  const server = createApp().listen(config.port, () => console.log(`API listening on http://localhost:${config.port}`));

  // Graceful shutdown (docker stop sends SIGTERM): stop taking requests, let the open ones finish,
  // then close the connection pool so MongoDB isn't left with dangling connections.
  let stopping = false;
  const shutdown = (signal: string) => {
    if (stopping) return;
    stopping = true;
    console.log(`${signal} received, shutting down`);
    server.close(() => {
      database.disconnect().finally(() => process.exit(0));
    });
    setTimeout(() => process.exit(1), 10_000).unref(); // don't hang on keep-alive sockets
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((err: Error) => {
  console.error('Failed to start:', err.message);
  process.exit(1);
});
