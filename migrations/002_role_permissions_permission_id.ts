// role_permissions.permission becomes a foreign key to permissions._id (it held the permission key),
// and every grant gets an isActive flag (existing grants stay active). Grants whose key is no longer
// in the permissions collection are removed. The { role: 1, permission: 1 } unique index is unchanged.
import type { mongo } from 'mongoose';
import type { Migration } from '../src/database/Migration';

const COLLECTION = 'role_permissions';

const validator = (permissionType: 'objectId' | 'string', withIsActive: boolean) => ({
  $jsonSchema: {
    bsonType: 'object',
    required: ['role', 'permission', ...(withIsActive ? ['isActive'] : [])],
    properties: {
      role: { bsonType: 'objectId' },
      permission: permissionType === 'string' ? { bsonType: 'string', minLength: 1, maxLength: 100 } : { bsonType: 'objectId' },
      ...(withIsActive ? { isActive: { bsonType: 'bool' } } : {}),
    },
  },
});

async function setValidator(db: mongo.Db, value: object | null): Promise<void> {
  await db.command(
    value
      ? { collMod: COLLECTION, validator: value, validationLevel: 'strict', validationAction: 'error' }
      : { collMod: COLLECTION, validator: {}, validationLevel: 'off' },
  );
}

async function permissionsById(db: mongo.Db): Promise<Array<{ _id: mongo.ObjectId; key: string }>> {
  return db.collection<{ _id: mongo.ObjectId; key: string }>('permissions').find({}, { projection: { key: 1 } }).toArray();
}

export default class RolePermissionsPermissionId implements Migration {
  async up(db: mongo.Db): Promise<void> {
    const grants = db.collection(COLLECTION);
    await setValidator(db, null); // the old validator only accepts a string permission
    for (const { _id, key } of await permissionsById(db)) {
      await grants.updateMany({ permission: key }, { $set: { permission: _id } });
    }
    await grants.deleteMany({ permission: { $type: 'string' } });
    await grants.updateMany({ isActive: { $exists: false } }, { $set: { isActive: true } });
    await setValidator(db, validator('objectId', true));
  }

  async down(db: mongo.Db): Promise<void> {
    const grants = db.collection(COLLECTION);
    await setValidator(db, null);
    for (const { _id, key } of await permissionsById(db)) {
      await grants.updateMany({ permission: _id }, { $set: { permission: key } });
    }
    await grants.deleteMany({ permission: { $type: 'objectId' } });
    await grants.updateMany({}, { $unset: { isActive: '' } });
    await setValidator(db, validator('string', false));
  }
}
