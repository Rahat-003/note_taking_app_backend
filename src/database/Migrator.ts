import fs from 'node:fs';
import path from 'node:path';
import { inject, singleton } from 'tsyringe';
import { Database } from './Database';
import type { Migration } from './Migration';

interface MigrationRecord {
  _id: string;
  appliedAt: Date;
}

/**
 * Runs each file in migrations/ once, in filename order. Applied migrations are recorded in the
 * "migrations" collection with the name as _id, so the built-in _id index is all it needs.
 */
@singleton()
export class Migrator {
  // src/database -> migrations (also dist/src/database -> dist/migrations after tsc).
  private static readonly DIR = path.join(__dirname, '..', '..', 'migrations');

  constructor(@inject(Database) private readonly database: Database) {}

  async applied(): Promise<string[]> {
    const rows = await this.log().find({}, { projection: { _id: 1 } }).sort({ _id: 1 }).toArray();
    return rows.map((m) => m._id);
  }

  async pending(): Promise<string[]> {
    const done = new Set(await this.applied());
    return this.available().filter((name) => !done.has(name));
  }

  async migrate(): Promise<string[]> {
    const ran: string[] = [];
    for (const name of await this.pending()) {
      await this.load(name).up(this.database.db);
      await this.log().insertOne({ _id: name, appliedAt: new Date() });
      ran.push(name);
    }
    return ran;
  }

  /** Reverts the most recently applied migration. */
  async rollback(): Promise<string | null> {
    const last = (await this.applied()).pop();
    if (!last) return null;
    await this.load(last).down(this.database.db);
    await this.log().deleteOne({ _id: last });
    return last;
  }

  private available(): string[] {
    return fs
      .readdirSync(Migrator.DIR)
      .filter((f) => /\.(ts|js)$/.test(f) && !f.endsWith('.d.ts'))
      .map((f) => path.basename(f, path.extname(f)))
      .sort();
  }

  private load(name: string): Migration {
    const module = require(path.join(Migrator.DIR, name)) as { default: new () => Migration };
    return new module.default();
  }

  private log() {
    return this.database.db.collection<MigrationRecord>('migrations');
  }
}
