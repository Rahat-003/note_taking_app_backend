// Admins can delete anyone's post (moderation): the posts.delete_any permission, granted to the admin role.
// Bootstrap keeps granting the admin role every permission; other roles get it only from the Roles screen.
// No index: deleting by _id uses the _id index. down() removes the permission and its grants.
import type { mongo } from 'mongoose';
import type { Migration } from '../src/database/Migration';

const PERMISSION = { key: 'posts.delete_any', description: "Delete anyone's posts (moderation)" };

export default class PostsDeleteAnyPermission implements Migration {
  async up(db: mongo.Db): Promise<void> {
    const permissions = db.collection('permissions');
    await permissions.updateOne({ key: PERMISSION.key }, { $set: { description: PERMISSION.description } }, { upsert: true });
    const permission = await permissions.findOne({ key: PERMISSION.key }, { projection: { _id: 1 } });
    const admin = await db.collection('roles').findOne({ name: 'admin' }, { projection: { _id: 1 } });
    if (!permission || !admin) return; // fresh database: bootstrap grants it
    await db
      .collection('role_permissions')
      .updateOne({ role_id: admin._id, permission_id: permission._id }, { $setOnInsert: { isActive: true } }, { upsert: true });
  }

  async down(db: mongo.Db): Promise<void> {
    const permissions = db.collection('permissions');
    const permission = await permissions.findOne({ key: PERMISSION.key }, { projection: { _id: 1 } });
    if (!permission) return;
    await db.collection('role_permissions').deleteMany({ permission_id: permission._id });
    await permissions.deleteOne({ _id: permission._id });
  }
}
