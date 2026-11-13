// Posts are back for Aggregation Scenario 2 (a user's posts via $lookup). Creates the posts collection with
// its validator and its one index, { user_id: 1, _id: -1 }, adds the posts.create permission and grants it
// to the admin and user roles (as bootstrap does for new databases). down() drops all of it again.
import type { mongo } from 'mongoose';
import type { Migration } from '../src/database/Migration';

const PERMISSION = { key: 'posts.create', description: 'Write posts (everyone can read them)' };
const INDEX = { name: 'user_id_1__id_-1', key: { user_id: 1, _id: -1 } as const };
const ROLES = ['admin', 'user'];

const str = (minLength: number, maxLength: number) => ({ bsonType: 'string', minLength, maxLength });
const date = { bsonType: 'date' };
const validator = {
  $jsonSchema: {
    bsonType: 'object',
    required: ['user_id', 'title', 'body'],
    properties: { user_id: { bsonType: 'objectId' }, title: str(1, 200), body: str(1, 20000), createdAt: date, updatedAt: date },
  },
};

export default class PostsScenario2 implements Migration {
  async up(db: mongo.Db): Promise<void> {
    const exists = (await db.listCollections({ name: 'posts' }, { nameOnly: true }).toArray()).length > 0;
    if (exists) await db.command({ collMod: 'posts', validator, validationLevel: 'strict', validationAction: 'error' });
    else await db.createCollection('posts', { validator, validationLevel: 'strict', validationAction: 'error' });
    await db.collection('posts').createIndex(INDEX.key, { name: INDEX.name });

    const permissions = db.collection('permissions');
    await permissions.updateOne({ key: PERMISSION.key }, { $set: { description: PERMISSION.description } }, { upsert: true });
    const permission = await permissions.findOne({ key: PERMISSION.key }, { projection: { _id: 1 } });
    for (const name of ROLES) {
      const role = await db.collection('roles').findOne({ name }, { projection: { _id: 1 } });
      if (!role || !permission) continue; // fresh database: bootstrap grants it
      await db
        .collection('role_permissions')
        .updateOne({ role_id: role._id, permission_id: permission._id }, { $setOnInsert: { isActive: true } }, { upsert: true });
    }
  }

  async down(db: mongo.Db): Promise<void> {
    const permissions = db.collection('permissions');
    const permission = await permissions.findOne({ key: PERMISSION.key }, { projection: { _id: 1 } });
    if (permission) {
      await db.collection('role_permissions').deleteMany({ permission_id: permission._id });
      await permissions.deleteOne({ _id: permission._id });
    }
    await db.collection('posts').drop().catch(() => undefined);
  }
}
