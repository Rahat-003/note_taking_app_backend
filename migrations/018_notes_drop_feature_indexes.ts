// Only indexes the task's queries need: drops the four notes indexes that served features beyond the
// task (note search, two "recently updated" sorts, the Archive view) together with notes.archivedAt.
// Left on notes: { user_id: 1, pinned_at: -1, _id: -1 } and _id. down() restores the indexes and field
// (archived notes take updatedAt as their archive time).
import type { mongo } from 'mongoose';
import type { Migration } from '../src/database/Migration';

type Key = Record<string, 1 | -1 | 'text'>;
const INDEXES: Array<{ name: string; key: Key; options?: mongo.CreateIndexesOptions }> = [
  { name: 'title_text_content_text', key: { title: 'text', content: 'text' } },
  { name: 'user_id_1_pinned_at_-1_updatedAt_-1', key: { user_id: 1, pinned_at: -1, updatedAt: -1 } },
  { name: 'updatedAt_-1', key: { updatedAt: -1 } },
  { name: 'user_id_1_archivedAt_-1__id_-1', key: { user_id: 1, archivedAt: -1, _id: -1 }, options: { partialFilterExpression: { isArchived: true } } },
];

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

export default class NotesDropFeatureIndexes implements Migration {
  async up(db: mongo.Db): Promise<void> {
    const notes = db.collection('notes');
    for (const index of INDEXES) await notes.dropIndex(index.name).catch(() => undefined);
    await db.command({ collMod: 'notes', validator: notesValidator(false), validationLevel: 'strict', validationAction: 'error' });
    await notes.updateMany({}, { $unset: { archivedAt: '' } });
  }

  async down(db: mongo.Db): Promise<void> {
    const notes = db.collection('notes');
    await notes.updateMany({ isArchived: true }, [{ $set: { archivedAt: '$updatedAt' } }]);
    await notes.updateMany({ isArchived: { $ne: true } }, { $set: { archivedAt: null } });
    await db.command({ collMod: 'notes', validator: notesValidator(true), validationLevel: 'strict', validationAction: 'error' });
    for (const index of INDEXES) await notes.createIndex(index.key, { name: index.name, ...index.options });
  }
}
