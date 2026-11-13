// Authors can edit and delete their own posts, each behind its own permission so an admin can allow or
// deny it per role: posts.update_own and posts.delete_own. Every role holding posts.create gets both
// (same isActive), so authors keep full control of their posts. No index: both act on { _id, user_id },
// matched by the _id index. down() removes the two permissions and their grants.
import type { mongo } from 'mongoose';
import type { Migration } from '../src/database/Migration';

const NEW_PERMISSIONS = [
  { key: 'posts.update_own', description: 'Edit own posts' },
  { key: 'posts.delete_own', description: 'Delete own posts' },
];

export default class PostsUpdateDeletePermissions implements Migration {
  async up(db: mongo.Db): Promise<void> {
    const permissions = db.collection('permissions');
    const grants = db.collection('role_permissions');
    for (const p of NEW_PERMISSIONS) {
      await permissions.updateOne({ key: p.key }, { $set: { description: p.description } }, { upsert: true });
    }
    const create = await permissions.findOne({ key: 'posts.create' }, { projection: { _id: 1 } });
    if (!create) return; // fresh database: bootstrap grants from role.json
    const newIds = (await permissions.find({ key: { $in: NEW_PERMISSIONS.map((p) => p.key) } }).toArray()).map((p) => p._id);
    for (const grant of await grants.find({ permission_id: create._id }).toArray()) {
      for (const permission_id of newIds) {
        await grants.updateOne({ role_id: grant.role_id, permission_id }, { $setOnInsert: { isActive: grant.isActive } }, { upsert: true });
      }
    }
  }

  async down(db: mongo.Db): Promise<void> {
    const permissions = db.collection('permissions');
    const ids = (await permissions.find({ key: { $in: NEW_PERMISSIONS.map((p) => p.key) } }).toArray()).map((p) => p._id);
    await db.collection('role_permissions').deleteMany({ permission_id: { $in: ids } });
    await permissions.deleteMany({ _id: { $in: ids } });
  }
}
