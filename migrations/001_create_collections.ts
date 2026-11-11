// Creates every collection with a $jsonSchema validator, then builds the indexes declared with
// schema.index() in src/domain. Re-running on existing collections only re-applies the validators.
import type { Model, mongo } from 'mongoose';
import type { Migration } from '../src/database/Migration';
import { NoteModel } from '../src/domain/Note';
import { PermissionModel } from '../src/domain/Permission';
import { PostModel } from '../src/domain/Post';
import { RoleModel } from '../src/domain/Role';
import { RolePermissionModel } from '../src/domain/RolePermission';
import { UserModel } from '../src/domain/User';

type JsonSchema = Record<string, unknown>;

const str = (maxLength: number, minLength = 0): JsonSchema => ({ bsonType: 'string', minLength, maxLength });
const objectId: JsonSchema = { bsonType: 'objectId' };
const date: JsonSchema = { bsonType: 'date' };

const collections: Array<{ model: Model<any>; schema: { required: string[]; properties: Record<string, JsonSchema> } }> = [
  {
    model: UserModel,
    schema: {
      required: ['name', 'email', 'password', 'role'],
      properties: {
        name: str(100, 1),
        email: str(254, 3),
        // Only bcrypt hashes may be stored, never a plaintext password.
        password: { bsonType: 'string', pattern: '^\\$2[aby]\\$\\d{2}\\$.{53}$' },
        role: objectId,
        interests: { bsonType: 'array', items: str(50, 1) },
        createdAt: date,
        updatedAt: date,
      },
    },
  },
  {
    model: NoteModel,
    schema: {
      required: ['owner', 'title'],
      properties: { owner: objectId, title: str(200, 1), content: str(20000), createdAt: date, updatedAt: date },
    },
  },
  {
    model: PostModel,
    schema: {
      required: ['author', 'title', 'body'],
      properties: { author: objectId, title: str(200, 1), body: str(20000, 1), createdAt: date, updatedAt: date },
    },
  },
  {
    model: RoleModel,
    schema: {
      required: ['name', 'system'],
      properties: { name: str(50, 1), description: str(200), system: { bsonType: 'bool' }, createdAt: date, updatedAt: date },
    },
  },
  {
    model: PermissionModel,
    schema: {
      required: ['key'],
      properties: { key: str(100, 1), description: str(200) },
    },
  },
  {
    model: RolePermissionModel,
    schema: {
      required: ['role', 'permission'],
      properties: { role: objectId, permission: str(100, 1) },
    },
  },
];

export default class CreateCollections implements Migration {
  async up(db: mongo.Db): Promise<void> {
    const existing = new Set((await db.listCollections({}, { nameOnly: true }).toArray()).map((c) => c.name));
    for (const { model, schema } of collections) {
      const name = model.collection.collectionName;
      const options = {
        validator: { $jsonSchema: { bsonType: 'object', ...schema } },
        validationLevel: 'strict' as const,
        validationAction: 'error' as const,
      };
      if (existing.has(name)) await db.command({ collMod: name, ...options });
      else await db.createCollection(name, options);
      await model.syncIndexes();
    }
  }

  async down(db: mongo.Db): Promise<void> {
    for (const { model } of collections) {
      await db.collection(model.collection.collectionName).drop().catch(() => undefined);
    }
  }
}
