// Vercel serverless entry: every request (see vercel.json rewrites) lands here and is handed to the same
// Express app as `npm start`. A warm function instance reuses its MongoDB connection pool; a cold one
// connects once and every request it handles waits for that.
//
// Migrations and the bootstrap seed do not run here. Run them once against the production database
// before the first deploy (and after adding a migration):  MONGO_URI=<atlas uri> npm run setup
import 'reflect-metadata';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { container } from '../src/container';
import { createApp } from '../src/app';
import { AppConfig } from '../src/config/AppConfig';
import { Database } from '../src/database/Database';

const config = container.resolve(AppConfig);
const app = createApp();
let connecting: Promise<void> | null = null;

function connectOnce(): Promise<void> {
  connecting ??= container
    .resolve(Database)
    .connect(config.mongoUri, config.mongoPool)
    .catch((err: unknown) => {
      connecting = null; // let the next request retry
      throw err;
    });
  return connecting;
}

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  try {
    await connectOnce();
  } catch (err) {
    console.error('MongoDB connection failed:', (err as Error).message);
    res.statusCode = 503;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'The database is not reachable. Try again shortly.', code: 'UNAVAILABLE' }));
    return;
  }
  app(req as never, res as never);
}
