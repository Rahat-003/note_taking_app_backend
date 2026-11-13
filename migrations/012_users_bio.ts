// Users get a bio: a short self-description shown on the profile (at most 500 characters, '' by default).
// Existing users get ''. The users validator learns the field; no index (bio is never queried).
import type { mongo } from 'mongoose';
import type { Migration } from '../src/database/Migration';

const str = (minLength: number, maxLength: number) => ({ bsonType: 'string', minLength, maxLength });
const date = { bsonType: 'date' };

function usersValidator(withBio: boolean) {
  return {
    $jsonSchema: {
      bsonType: 'object',
      required: ['name', 'email', 'password', 'role_id'],
      properties: {
        name: str(1, 100),
        email: str(3, 254),
        // Only bcrypt hashes may be stored, never a plaintext password.
        password: { bsonType: 'string', pattern: '^\\$2[aby]\\$\\d{2}\\$.{53}$' },
        role_id: { bsonType: 'objectId' },
        interests: { bsonType: 'array', items: str(1, 50) },
        ...(withBio ? { bio: str(0, 500) } : {}),
        createdAt: date,
        updatedAt: date,
      },
    },
  };
}

export default class UsersBio implements Migration {
  async up(db: mongo.Db): Promise<void> {
    await db.collection('users').updateMany({ bio: { $exists: false } }, { $set: { bio: '' } });
    await db.command({ collMod: 'users', validator: usersValidator(true), validationLevel: 'strict', validationAction: 'error' });
  }

  async down(db: mongo.Db): Promise<void> {
    await db.command({ collMod: 'users', validator: usersValidator(false), validationLevel: 'strict', validationAction: 'error' });
    await db.collection('users').updateMany({}, { $unset: { bio: '' } });
  }
}
