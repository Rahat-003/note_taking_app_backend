// Posts are removed from the app: drops the posts collection (and with it its { user_id: 1, _id: -1 }
// index), the posts.create / posts.delete_any permissions and every role grant of them.
// down() recreates the empty collection with its validator and index, and the two permissions,
// granted to the admin role (all permissions) and posts.create to the user role, as bootstrap did.
// Posts deleted by up() cannot be restored.
import type { mongo } from 'mongoose';
import type { Migration } from '../src/database/Migration';

const POST_PERMISSIONS = [
  { key: 'posts.create', description: 'Write posts' },
  { key: 'posts.delete_any', description: "Delete anyone's posts" },
];

const str = (minLength: number, maxLength: number) => ({ bsonType: 'string', minLength, maxLength });
const date = { bsonType: 'date' };

export default class RemovePosts implements Migration {
  async up(db: mongo.Db): Promise<void> {
    const keys = POST_PERMISSIONS.map((p) => p.key);
    const permissions = db.collection('permissions');
    const ids = (await permissions.find({ key: { $in: keys } }, { projection: { _id: 1 } }).toArray()).map((p) => p._id);
    await db.collection('role_permissions').deleteMany({ permission_id: { $in: ids } });
    await permissions.deleteMany({ _id: { $in: ids } });
    await db.collection('posts').drop().catch(() => undefined); // already gone
  }

  async down(db: mongo.Db): Promise<void> {
    const exists = (await db.listCollections({ name: 'posts' }, { nameOnly: true }).toArray()).length > 0;
    if (!exists) {
      await db.createCollection('posts', {
        validator: {
          $jsonSchema: {
            bsonType: 'object',
            required: ['user_id', 'title', 'body'],
            properties: { user_id: { bsonType: 'objectId' }, title: str(1, 200), body: str(1, 20000), createdAt: date, updatedAt: date },
          },
        },
        validationLevel: 'strict',
        validationAction: 'error',
      });
    }
    await db.collection('posts').createIndex({ user_id: 1, _id: -1 }, { name: 'user_id_1__id_-1' });

    const permissions = db.collection('permissions');
    for (const p of POST_PERMISSIONS) {
      await permissions.updateOne({ key: p.key }, { $set: { description: p.description } }, { upsert: true });
    }
    const byKey = new Map((await permissions.find({ key: { $in: POST_PERMISSIONS.map((p) => p.key) } }).toArray()).map((p) => [p.key, p._id]));
    const roles = db.collection('roles');
    const grants: Array<[string, string]> = [
      ['admin', 'posts.create'],
      ['admin', 'posts.delete_any'],
      ['user', 'posts.create'],
    ];
    for (const [roleName, key] of grants) {
      const role = await roles.findOne({ name: roleName }, { projection: { _id: 1 } });
      if (!role) continue;
      await db
        .collection('role_permissions')
        .updateOne({ role_id: role._id, permission_id: byKey.get(key) }, { $setOnInsert: { isActive: true } }, { upsert: true });
    }
  }
}
