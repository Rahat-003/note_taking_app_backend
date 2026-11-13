// Admins can deactivate users: users.isActive (true for every existing user). A deactivated user cannot
// sign in, and every request carrying their token is refused (the user is reloaded per request).
// No index: isActive is read from the user document already fetched by _id or email.
import type { mongo } from 'mongoose';
import type { Migration } from '../src/database/Migration';

const str = (minLength: number, maxLength: number) => ({ bsonType: 'string', minLength, maxLength });
const date = { bsonType: 'date' };

function usersValidator(withIsActive: boolean) {
  return {
    $jsonSchema: {
      bsonType: 'object',
      required: ['name', 'email', 'password', 'role_id', ...(withIsActive ? ['isActive'] : [])],
      properties: {
        name: str(1, 100),
        email: str(3, 254),
        // Only bcrypt hashes may be stored, never a plaintext password.
        password: { bsonType: 'string', pattern: '^\\$2[aby]\\$\\d{2}\\$.{53}$' },
        role_id: { bsonType: 'objectId' },
        interests: { bsonType: 'array', items: str(1, 50) },
        bio: str(0, 500),
        ...(withIsActive ? { isActive: { bsonType: 'bool' } } : {}),
        createdAt: date,
        updatedAt: date,
      },
    },
  };
}

export default class UsersIsActive implements Migration {
  async up(db: mongo.Db): Promise<void> {
    await db.collection('users').updateMany({ isActive: { $exists: false } }, { $set: { isActive: true } });
    await db.command({ collMod: 'users', validator: usersValidator(true), validationLevel: 'strict', validationAction: 'error' });
  }

  async down(db: mongo.Db): Promise<void> {
    await db.command({ collMod: 'users', validator: usersValidator(false), validationLevel: 'strict', validationAction: 'error' });
    await db.collection('users').updateMany({}, { $unset: { isActive: '' } });
  }
}
