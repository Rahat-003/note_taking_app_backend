import dotenv from 'dotenv';
import type { SignOptions } from 'jsonwebtoken';
import { singleton } from 'tsyringe';

dotenv.config({ quiet: true });

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
    .map((origin) => origin.trim().replace(/\/+$/, ''))
    .filter(Boolean);

  constructor() {
    if (this.jwtSecret.length < 32) throw new Error('JWT_SECRET must be set and at least 32 characters long');
  }
}
