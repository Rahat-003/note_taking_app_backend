// Notes get status / category / tags, plus the indexes for searching and for sorting by updated date:
//   { user_id: 1, updatedAt: -1 }   "my notes" sorted by updated date
//   { updatedAt: -1 }               every user's notes sorted by updated date
//   { title: 'text', content: 'text' }   search (?q=)
// Existing notes become status "active" with no tags.
import type { mongo } from 'mongoose';
import type { Migration } from '../src/database/Migration';

const COLLECTION = 'notes';

const INDEXES: Array<{ name: string; key: Record<string, 1 | -1 | 'text'> }> = [
  { name: 'user_id_1_updatedAt_-1', key: { user_id: 1, updatedAt: -1 } },
  { name: 'updatedAt_-1', key: { updatedAt: -1 } },
  { name: 'title_text_content_text', key: { title: 'text', content: 'text' } },
];

const str = (minLength: number, maxLength: number) => ({ bsonType: 'string', minLength, maxLength });

function validator(withNewFields: boolean) {
  const properties: Record<string, object> = {
    user_id: { bsonType: 'objectId' },
    title: str(1, 200),
    content: str(0, 20000),
    createdAt: { bsonType: 'date' },
    updatedAt: { bsonType: 'date' },
  };
  if (withNewFields) {
    properties.status = { enum: ['active', 'archived'] };
    properties.category = str(1, 50);
    properties.tags = { bsonType: 'array', maxItems: 20, items: str(1, 30) };
  }
  return {
    $jsonSchema: {
      bsonType: 'object',
      required: ['user_id', 'title', ...(withNewFields ? ['status', 'tags'] : [])],
      properties,
    },
  };
}

export default class NotesSearchFilterSort implements Migration {
  async up(db: mongo.Db): Promise<void> {
    const notes = db.collection(COLLECTION);
    await notes.updateMany({ status: { $exists: false } }, { $set: { status: 'active' } });
    await notes.updateMany({ tags: { $exists: false } }, { $set: { tags: [] } });
    for (const { name, key } of INDEXES) await notes.createIndex(key, { name });
    await db.command({ collMod: COLLECTION, validator: validator(true), validationLevel: 'strict', validationAction: 'error' });
  }

  async down(db: mongo.Db): Promise<void> {
    const notes = db.collection(COLLECTION);
    await db.command({ collMod: COLLECTION, validator: validator(false), validationLevel: 'strict', validationAction: 'error' });
    for (const { name } of INDEXES) await notes.dropIndex(name).catch(() => undefined);
    await notes.updateMany({}, { $unset: { status: '', category: '', tags: '' } });
  }
}
