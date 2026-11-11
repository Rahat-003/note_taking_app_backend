// notes.status ("active" | "archived") becomes notes.isArchived (boolean, default false).
// Archived notes are left out of the notes list unless asked for (?isArchived=true / all).
// No index changes: like status before, isArchived is applied to the rows the user_id indexes find.
import type { mongo } from 'mongoose';
import type { Migration } from '../src/database/Migration';

const str = (minLength: number, maxLength: number) => ({ bsonType: 'string', minLength, maxLength });
const objectId = { bsonType: 'objectId' };
const date = { bsonType: 'date' };

function notesValidator(archive: 'isArchived' | 'status') {
  return {
    $jsonSchema: {
      bsonType: 'object',
      required: ['user_id', 'title', archive, 'tag_ids'],
      properties: {
        user_id: objectId,
        title: str(1, 200),
        content: str(0, 20000),
        ...(archive === 'isArchived' ? { isArchived: { bsonType: 'bool' } } : { status: { enum: ['active', 'archived'] } }),
        category_id: objectId,
        tag_ids: { bsonType: 'array', maxItems: 20, items: objectId },
        createdAt: date,
        updatedAt: date,
      },
    },
  };
}

async function setValidator(db: mongo.Db, validator: object | null): Promise<void> {
  await db.command(
    validator
      ? { collMod: 'notes', validator, validationLevel: 'strict', validationAction: 'error' }
      : { collMod: 'notes', validator: {}, validationLevel: 'off' },
  );
}

export default class NotesIsArchived implements Migration {
  async up(db: mongo.Db): Promise<void> {
    const notes = db.collection('notes');
    await setValidator(db, null); // the old validator requires status
    await notes.updateMany({ status: 'archived' }, { $set: { isArchived: true }, $unset: { status: '' } });
    await notes.updateMany({ isArchived: { $exists: false } }, { $set: { isArchived: false }, $unset: { status: '' } });
    await setValidator(db, notesValidator('isArchived'));
  }

  async down(db: mongo.Db): Promise<void> {
    const notes = db.collection('notes');
    await setValidator(db, null);
    await notes.updateMany({ isArchived: true }, { $set: { status: 'archived' }, $unset: { isArchived: '' } });
    await notes.updateMany({ status: { $exists: false } }, { $set: { status: 'active' }, $unset: { isArchived: '' } });
    await setValidator(db, notesValidator('status'));
  }
}
