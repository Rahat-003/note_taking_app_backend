import dotenv from 'dotenv';
import type { SignOptions } from 'jsonwebtoken';
import { singleton } from 'tsyringe';

dotenv.config({ quiet: true });

/** MongoDB driver connection pool settings (passed to mongoose.connect). */
export interface MongoPoolOptions {
  maxPoolSize: number;
  minPoolSize: number;
  maxConnecting: number;
  maxIdleTimeMS: number;
  waitQueueTimeoutMS: number;
  serverSelectionTimeoutMS: number;
  socketTimeoutMS: number;
}

/** A required whole number from the environment (.env); startup fails when it is missing or invalid. */
function intEnv(name: string, min = 0): number {
  const raw = process.env[name]?.trim();
  if (!raw) throw new Error(`${name} must be set in backend/.env (see .env.example)`);
  const value = Number(raw);
  if (!Number.isInteger(value) || value < min) throw new Error(`${name} must be a whole number ≥ ${min}, got "${raw}"`);
  return value;
}

@singleton()
export class AppConfig {
  readonly port: number = Number(process.env.PORT) || 3000;
  readonly mongoUri: string = process.env.MONGO_URI || 'mongodb://127.0.0.1:27018/secure_notes';
  readonly jwtSecret: string = process.env.JWT_SECRET ?? '';
  readonly jwtExpiresIn = (process.env.JWT_EXPIRES_IN || '1h') as NonNullable<SignOptions['expiresIn']>;
  /**
   * Browser origins allowed to call the API cross-origin (CORS_ORIGINS, comma separated; "*" allows any).
   * Defaults to the Vite dev server and the Docker frontend.
   */
  readonly corsOrigins: readonly string[] = (process.env.CORS_ORIGINS ?? 'http://localhost:5173,http://localhost:8080')
    .split(',')
    // Tolerate pasted values like "https://app.example.com/" (quotes, spaces, trailing slash).
    .map((origin) => origin.trim().replace(/^["']|["']$/g, '').trim().replace(/\/+$/, ''))
    .filter(Boolean);

  /**
   * Connection pool of the API process, read from backend/.env at startup (no values in code; see
   * .env.example for the recommended ones and why). One request uses up to 3 connections at once (the auth
   * lookup, then a list and its count in parallel).
   */
  readonly mongoPool: MongoPoolOptions = {
    maxPoolSize: intEnv('MONGO_MAX_POOL_SIZE', 1),
    minPoolSize: intEnv('MONGO_MIN_POOL_SIZE'),
    maxConnecting: intEnv('MONGO_MAX_CONNECTING', 1),
    maxIdleTimeMS: intEnv('MONGO_MAX_IDLE_TIME_MS'),
    waitQueueTimeoutMS: intEnv('MONGO_WAIT_QUEUE_TIMEOUT_MS'),
    serverSelectionTimeoutMS: intEnv('MONGO_SERVER_SELECTION_TIMEOUT_MS', 1),
    socketTimeoutMS: intEnv('MONGO_SOCKET_TIMEOUT_MS'),
  };

  /** Short-lived CLI scripts (migrate, bootstrap, explain) run one query at a time: a small pool, nothing kept warm. */
  readonly mongoScriptPool: MongoPoolOptions = { ...this.mongoPool, maxPoolSize: Math.min(5, this.mongoPool.maxPoolSize), minPoolSize: 0 };

  constructor() {
    if (this.jwtSecret.length < 32) throw new Error('JWT_SECRET must be set and at least 32 characters long');
    if (this.mongoPool.minPoolSize > this.mongoPool.maxPoolSize) {
      throw new Error('MONGO_MIN_POOL_SIZE must not be larger than MONGO_MAX_POOL_SIZE');
    }
  }
}
