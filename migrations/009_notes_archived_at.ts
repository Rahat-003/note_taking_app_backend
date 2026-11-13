// Notes get archivedAt: when the note was archived, or null when it is not. The archive lists one user's
// archived notes most recently archived first, served by a new partial index (archived notes only):
//   { user_id: 1, archivedAt: -1, _id: -1 } where isArchived: true
// Notes archived before this migration have no recorded archive time, so they take their updatedAt
// (pinning / archiving never moved updatedAt, so it is the last edit before archiving).
import type { mongo } from 'mongoose';
import type { Migration } from '../src/database/Migration';

const INDEX = { name: 'user_id_1_archivedAt_-1__id_-1', key: { user_id: 1, archivedAt: -1, _id: -1 } as const };

const str = (minLength: number, maxLength: number) => ({ bsonType: 'string', minLength, maxLength });
const objectId = { bsonType: 'objectId' };
const date = { bsonType: 'date' };

function notesValidator(withArchivedAt: boolean) {
  return {
    $jsonSchema: {
      bsonType: 'object',
      required: ['user_id', 'title', 'isArchived', 'pinned_at', 'tag_ids', ...(withArchivedAt ? ['archivedAt'] : [])],
      properties: {
        user_id: objectId,
        title: str(1, 200),
        content: str(0, 20000),
        isArchived: { bsonType: 'bool' },
        ...(withArchivedAt ? { archivedAt: { bsonType: ['date', 'null'] } } : {}),
        pinned_at: { bsonType: ['date', 'null'] },
        category_id: objectId,
        tag_ids: { bsonType: 'array', maxItems: 20, items: objectId },
        createdAt: date,
        updatedAt: date,
      },
    },
  };
}

export default class NotesArchivedAt implements Migration {
  async up(db: mongo.Db): Promise<void> {
    const notes = db.collection('notes');
    await notes.updateMany({ isArchived: true, archivedAt: { $exists: false } }, [{ $set: { archivedAt: '$updatedAt' } }]);
    await notes.updateMany({ archivedAt: { $exists: false } }, { $set: { archivedAt: null } });
    await notes.createIndex(INDEX.key, { name: INDEX.name, partialFilterExpression: { isArchived: true } });
    await db.command({ collMod: 'notes', validator: notesValidator(true), validationLevel: 'strict', validationAction: 'error' });
  }

  async down(db: mongo.Db): Promise<void> {
    const notes = db.collection('notes');
    await db.command({ collMod: 'notes', validator: notesValidator(false), validationLevel: 'strict', validationAction: 'error' });
    await notes.dropIndex(INDEX.name).catch(() => undefined);
    await notes.updateMany({}, { $unset: { archivedAt: '' } });
  }
}
