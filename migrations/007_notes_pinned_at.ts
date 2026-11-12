// Notes can be pinned: notes.pinned_at holds the time the note was pinned, or null when it is not.
// In a user's list pinned notes come first (most recently pinned first), so pinned_at joins the four
// user_id-prefixed note indexes right after their equality fields; the old versions are dropped.
import type { mongo } from 'mongoose';
import type { Migration } from '../src/database/Migration';

type Key = Record<string, 1 | -1>;

const INDEXES: Array<{ old: { name: string; key: Key }; new: { name: string; key: Key } }> = [
  {
    old: { name: 'user_id_1__id_-1', key: { user_id: 1, _id: -1 } },
    new: { name: 'user_id_1_pinned_at_-1__id_-1', key: { user_id: 1, pinned_at: -1, _id: -1 } },
  },
  {
    old: { name: 'user_id_1_updatedAt_-1', key: { user_id: 1, updatedAt: -1 } },
    new: { name: 'user_id_1_pinned_at_-1_updatedAt_-1', key: { user_id: 1, pinned_at: -1, updatedAt: -1 } },
  },
  {
    old: { name: 'user_id_1_category_id_1__id_-1', key: { user_id: 1, category_id: 1, _id: -1 } },
    new: { name: 'user_id_1_category_id_1_pinned_at_-1__id_-1', key: { user_id: 1, category_id: 1, pinned_at: -1, _id: -1 } },
  },
  {
    old: { name: 'user_id_1_tag_ids_1__id_-1', key: { user_id: 1, tag_ids: 1, _id: -1 } },
    new: { name: 'user_id_1_tag_ids_1_pinned_at_-1__id_-1', key: { user_id: 1, tag_ids: 1, pinned_at: -1, _id: -1 } },
  },
];

const str = (minLength: number, maxLength: number) => ({ bsonType: 'string', minLength, maxLength });
const objectId = { bsonType: 'objectId' };
const date = { bsonType: 'date' };

function notesValidator(withPinnedAt: boolean) {
  return {
    $jsonSchema: {
      bsonType: 'object',
      required: ['user_id', 'title', 'isArchived', 'tag_ids', ...(withPinnedAt ? ['pinned_at'] : [])],
      properties: {
        user_id: objectId,
        title: str(1, 200),
        content: str(0, 20000),
        isArchived: { bsonType: 'bool' },
        ...(withPinnedAt ? { pinned_at: { bsonType: ['date', 'null'] } } : {}),
        category_id: objectId,
        tag_ids: { bsonType: 'array', maxItems: 20, items: objectId },
        createdAt: date,
        updatedAt: date,
      },
    },
  };
}

export default class NotesPinnedAt implements Migration {
  async up(db: mongo.Db): Promise<void> {
    const notes = db.collection('notes');
    await notes.updateMany({ pinned_at: { $exists: false } }, { $set: { pinned_at: null } });
    for (const index of INDEXES) {
      await notes.createIndex(index.new.key, { name: index.new.name }); // before dropping: never without an index
      await notes.dropIndex(index.old.name).catch(() => undefined);
    }
    await db.command({ collMod: 'notes', validator: notesValidator(true), validationLevel: 'strict', validationAction: 'error' });
  }

  async down(db: mongo.Db): Promise<void> {
    const notes = db.collection('notes');
    await db.command({ collMod: 'notes', validator: notesValidator(false), validationLevel: 'strict', validationAction: 'error' });
    for (const index of INDEXES) {
      await notes.createIndex(index.old.key, { name: index.old.name });
      await notes.dropIndex(index.new.name).catch(() => undefined);
    }
    await notes.updateMany({}, { $unset: { pinned_at: '' } });
  }
}
