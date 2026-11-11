import type { mongo } from 'mongoose';

/** A schema migration in migrations/. Each file default-exports a class implementing this. */
export interface Migration {
  up(db: mongo.Db): Promise<void>;
  down(db: mongo.Db): Promise<void>;
}
