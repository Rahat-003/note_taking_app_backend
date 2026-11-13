// Updating and deleting own notes get their own permissions, so an admin can allow or deny each per role:
//   notes.manage_own   create, list and view own notes (it covered update and delete before)
//   notes.update_own   update own notes (edit, pin and archive)
//   notes.delete_own   delete own notes
// Every role that holds notes.manage_own today gets both new grants with the same isActive, so nobody
// loses access by this migration. down() removes the two permissions and their grants.
import type { mongo } from 'mongoose';
import type { Migration } from '../src/database/Migration';

const NEW_PERMISSIONS = [
  { key: 'notes.update_own', description: 'Update own notes (edit, pin and archive)' },
  { key: 'notes.delete_own', description: 'Delete own notes' },
];
const MANAGE_OWN = 'notes.manage_own';
const DESCRIPTIONS = { before: 'Create, view, update and delete own notes', after: 'Create, list and view own notes' };

export default class NotesUpdateDeletePermissions implements Migration {
  async up(db: mongo.Db): Promise<void> {
    const permissions = db.collection('permissions');
    const grants = db.collection('role_permissions');
    for (const p of NEW_PERMISSIONS) {
      await permissions.updateOne({ key: p.key }, { $set: { description: p.description } }, { upsert: true });
    }
    await permissions.updateOne({ key: MANAGE_OWN }, { $set: { description: DESCRIPTIONS.after } });

    const manageOwn = await permissions.findOne({ key: MANAGE_OWN }, { projection: { _id: 1 } });
    if (!manageOwn) return; // fresh database: bootstrap grants from role.json
    const newIds = (await permissions.find({ key: { $in: NEW_PERMISSIONS.map((p) => p.key) } }).toArray()).map((p) => p._id);
    for (const grant of await grants.find({ permission_id: manageOwn._id }).toArray()) {
      for (const permission_id of newIds) {
        await grants.updateOne(
          { role_id: grant.role_id, permission_id },
          { $setOnInsert: { isActive: grant.isActive } },
          { upsert: true },
        );
      }
    }
  }

  async down(db: mongo.Db): Promise<void> {
    const permissions = db.collection('permissions');
    const ids = (await permissions.find({ key: { $in: NEW_PERMISSIONS.map((p) => p.key) } }).toArray()).map((p) => p._id);
    await db.collection('role_permissions').deleteMany({ permission_id: { $in: ids } });
    await permissions.deleteMany({ _id: { $in: ids } });
    await permissions.updateOne({ key: MANAGE_OWN }, { $set: { description: DESCRIPTIONS.before } });
  }
}
