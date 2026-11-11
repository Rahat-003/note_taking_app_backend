// Foreign keys are named <referencedDocument>_id:
//   users.role -> users.role_id                 notes.owner -> notes.user_id
//   posts.author -> posts.user_id               role_permissions.role / .permission -> role_id / permission_id
// Renames the fields in place, rebuilds the affected indexes under their new names and swaps the
// validators. The old indexes are dropped before the rename: renamed documents would otherwise all
// index as null in the old unique { role, permission } index and collide.
import type { mongo } from 'mongoose';
import type { Migration } from '../src/database/Migration';

type Schema = Record<string, unknown>;

const str = (minLength: number, maxLength: number): Schema => ({ bsonType: 'string', minLength, maxLength });
const objectId: Schema = { bsonType: 'objectId' };
const date: Schema = { bsonType: 'date' };
const bool: Schema = { bsonType: 'bool' };

/** Validator for each collection, given the names of its foreign-key fields. */
const validators: Record<string, (fk: Record<string, string>) => Schema> = {
  users: (fk) => ({
    required: ['name', 'email', 'password', fk.role!],
    properties: {
      name: str(1, 100),
      email: str(3, 254),
      password: { bsonType: 'string', pattern: '^\\$2[aby]\\$\\d{2}\\$.{53}$' },
      [fk.role!]: objectId,
      interests: { bsonType: 'array', items: str(1, 50) },
      createdAt: date,
      updatedAt: date,
    },
  }),
  notes: (fk) => ({
    required: [fk.user!, 'title'],
    properties: { [fk.user!]: objectId, title: str(1, 200), content: str(0, 20000), createdAt: date, updatedAt: date },
  }),
  posts: (fk) => ({
    required: [fk.user!, 'title', 'body'],
    properties: { [fk.user!]: objectId, title: str(1, 200), body: str(1, 20000), createdAt: date, updatedAt: date },
  }),
  role_permissions: (fk) => ({
    required: [fk.role!, fk.permission!, 'isActive'],
    properties: { [fk.role!]: objectId, [fk.permission!]: objectId, isActive: bool },
  }),
};

interface Change {
  collection: string;
  /** old field name -> new field name */
  rename: Record<string, string>;
  /** validator keys (role/user/permission) -> old and new field names */
  fk: { old: Record<string, string>; new: Record<string, string> };
  index: { old: { name: string; key: Record<string, 1 | -1>; unique?: boolean }; new: { name: string; key: Record<string, 1 | -1>; unique?: boolean } };
}

const changes: Change[] = [
  {
    collection: 'users',
    rename: { role: 'role_id' },
    fk: { old: { role: 'role' }, new: { role: 'role_id' } },
    index: { old: { name: 'role_1', key: { role: 1 } }, new: { name: 'role_id_1', key: { role_id: 1 } } },
  },
  {
    collection: 'notes',
    rename: { owner: 'user_id' },
    fk: { old: { user: 'owner' }, new: { user: 'user_id' } },
    index: {
      old: { name: 'owner_1__id_-1', key: { owner: 1, _id: -1 } },
      new: { name: 'user_id_1__id_-1', key: { user_id: 1, _id: -1 } },
    },
  },
  {
    collection: 'posts',
    rename: { author: 'user_id' },
    fk: { old: { user: 'author' }, new: { user: 'user_id' } },
    index: {
      old: { name: 'author_1__id_-1', key: { author: 1, _id: -1 } },
      new: { name: 'user_id_1__id_-1', key: { user_id: 1, _id: -1 } },
    },
  },
  {
    collection: 'role_permissions',
    rename: { role: 'role_id', permission: 'permission_id' },
    fk: { old: { role: 'role', permission: 'permission' }, new: { role: 'role_id', permission: 'permission_id' } },
    index: {
      old: { name: 'role_1_permission_1', key: { role: 1, permission: 1 }, unique: true },
      new: { name: 'role_id_1_permission_id_1', key: { role_id: 1, permission_id: 1 }, unique: true },
    },
  },
];

async function apply(db: mongo.Db, change: Change, direction: 'up' | 'down'): Promise<void> {
  const from = direction === 'up' ? change.index.old : change.index.new;
  const to = direction === 'up' ? change.index.new : change.index.old;
  const rename = direction === 'up' ? change.rename : Object.fromEntries(Object.entries(change.rename).map(([a, b]) => [b, a]));
  const fk = direction === 'up' ? change.fk.new : change.fk.old;
  const collection = db.collection(change.collection);

  await db.command({ collMod: change.collection, validator: {}, validationLevel: 'off' });
  await collection.dropIndex(from.name).catch(() => undefined); // absent on a fresh database
  await collection.updateMany({}, { $rename: rename });
  await collection.createIndex(to.key, { name: to.name, unique: to.unique ?? false });
  await db.command({
    collMod: change.collection,
    validator: { $jsonSchema: { bsonType: 'object', ...validators[change.collection]!(fk) } },
    validationLevel: 'strict',
    validationAction: 'error',
  });
}

export default class ForeignKeysDocumentId implements Migration {
  async up(db: mongo.Db): Promise<void> {
    for (const change of changes) await apply(db, change, 'up');
  }

  async down(db: mongo.Db): Promise<void> {
    for (const change of [...changes].reverse()) await apply(db, change, 'down');
  }
}
