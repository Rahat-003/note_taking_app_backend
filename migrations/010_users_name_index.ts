// Users can be searched by name or email (GET /api/users?q=, used by the admin's "filter notes by user"
// picker). The email half of the search uses the existing { email: 1 } index; this adds { name: 1 }
// for the name half and for sorting the results by name.
import type { mongo } from 'mongoose';
import type { Migration } from '../src/database/Migration';

const INDEX = 'name_1';

export default class UsersNameIndex implements Migration {
  async up(db: mongo.Db): Promise<void> {
    await db.collection('users').createIndex({ name: 1 }, { name: INDEX });
  }

  async down(db: mongo.Db): Promise<void> {
    await db.collection('users').dropIndex(INDEX).catch(() => undefined);
  }
}
