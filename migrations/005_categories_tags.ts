// Categories and tags become documents that notes reference:
//   categories { name }                         tags { name }                       (unique names)
//   notes.category -> notes.category_id         notes.tags -> notes.tag_ids        (foreign keys)
//   user_categories { user_id, category_id, noteCount }    user_tags { user_id, tag_id, noteCount }
// The user_* collections list each user's categories / tags with note counts without scanning notes;
// they are built here from the existing notes. Notes also get { user_id, category_id, _id } and
// { user_id, tag_ids, _id } for fetching one user's notes in a category / with a tag.
import type { mongo } from 'mongoose';
import type { Migration } from '../src/database/Migration';

type Db = mongo.Db;
type ObjectId = mongo.ObjectId;

const str = (minLength: number, maxLength: number) => ({ bsonType: 'string', minLength, maxLength });
const objectId = { bsonType: 'objectId' };
const date = { bsonType: 'date' };
const count = { bsonType: ['int', 'long'], minimum: 0 };

const NEW_COLLECTIONS = [
  {
    name: 'categories',
    schema: { required: ['name'], properties: { name: str(1, 50), createdAt: date, updatedAt: date } },
    indexes: [{ name: 'name_1', key: { name: 1 }, unique: true }],
  },
  {
    name: 'tags',
    schema: { required: ['name'], properties: { name: str(1, 30), createdAt: date, updatedAt: date } },
    indexes: [{ name: 'name_1', key: { name: 1 }, unique: true }],
  },
  {
    name: 'user_categories',
    schema: { required: ['user_id', 'category_id', 'noteCount'], properties: { user_id: objectId, category_id: objectId, noteCount: count } },
    indexes: [{ name: 'user_id_1_category_id_1', key: { user_id: 1, category_id: 1 }, unique: true }],
  },
  {
    name: 'user_tags',
    schema: { required: ['user_id', 'tag_id', 'noteCount'], properties: { user_id: objectId, tag_id: objectId, noteCount: count } },
    indexes: [{ name: 'user_id_1_tag_id_1', key: { user_id: 1, tag_id: 1 }, unique: true }],
  },
] as const;

const NOTE_INDEXES = [
  { name: 'user_id_1_category_id_1__id_-1', key: { user_id: 1, category_id: 1, _id: -1 } },
  { name: 'user_id_1_tag_ids_1__id_-1', key: { user_id: 1, tag_ids: 1, _id: -1 } },
] as const;

/** The notes validator before (string category / tags) and after (foreign keys) this migration. */
function notesValidator(withReferences: boolean) {
  const common = {
    user_id: objectId,
    title: str(1, 200),
    content: str(0, 20000),
    status: { enum: ['active', 'archived'] },
    createdAt: date,
    updatedAt: date,
  };
  const labels = withReferences
    ? { category_id: objectId, tag_ids: { bsonType: 'array', maxItems: 20, items: objectId } }
    : { category: str(1, 50), tags: { bsonType: 'array', maxItems: 20, items: str(1, 30) } };
  return {
    $jsonSchema: {
      bsonType: 'object',
      required: ['user_id', 'title', 'status', withReferences ? 'tag_ids' : 'tags'],
      properties: { ...common, ...labels },
    },
  };
}

async function setNotesValidator(db: Db, validator: object | null): Promise<void> {
  await db.command(
    validator
      ? { collMod: 'notes', validator, validationLevel: 'strict', validationAction: 'error' }
      : { collMod: 'notes', validator: {}, validationLevel: 'off' },
  );
}

/** Upserts a document per name and returns name -> _id. */
async function idsByName(db: Db, collection: string, names: string[]): Promise<Map<string, ObjectId>> {
  const coll = db.collection<{ _id: ObjectId; name: string }>(collection);
  const now = new Date();
  for (const name of names) {
    await coll.updateOne({ name }, { $setOnInsert: { name, createdAt: now, updatedAt: now } }, { upsert: true });
  }
  const docs = names.length ? await coll.find({ name: { $in: names } }).toArray() : [];
  return new Map(docs.map((d) => [d.name, d._id]));
}

export default class CategoriesTags implements Migration {
  async up(db: Db): Promise<void> {
    const existing = new Set((await db.listCollections({}, { nameOnly: true }).toArray()).map((c) => c.name));
    for (const { name, schema, indexes } of NEW_COLLECTIONS) {
      const validator = { $jsonSchema: { bsonType: 'object', ...schema } };
      if (existing.has(name)) await db.command({ collMod: name, validator, validationLevel: 'strict', validationAction: 'error' });
      else await db.createCollection(name, { validator, validationLevel: 'strict', validationAction: 'error' });
      for (const { name: indexName, key, unique } of indexes) await db.collection(name).createIndex(key, { name: indexName, unique });
    }

    const notes = db.collection('notes');
    const categoryIds = await idsByName(db, 'categories', (await notes.distinct('category', { category: { $type: 'string' } })) as string[]);
    const tagIds = await idsByName(db, 'tags', (await notes.distinct('tags', { tags: { $type: 'string' } })) as string[]);

    await setNotesValidator(db, null); // the old validator rejects category_id / tag_ids
    for await (const note of notes.find({ $or: [{ category: { $exists: true } }, { tags: { $exists: true } }] })) {
      const set: Record<string, unknown> = { tag_ids: ((note.tags as string[] | undefined) ?? []).map((t) => tagIds.get(t)).filter(Boolean) };
      const category = typeof note.category === 'string' ? categoryIds.get(note.category) : undefined;
      if (category) set.category_id = category;
      await notes.updateOne({ _id: note._id }, { $set: set, $unset: { category: '', tags: '' } });
    }
    await notes.updateMany({ tag_ids: { $exists: false } }, { $set: { tag_ids: [] } });
    for (const { name, key } of NOTE_INDEXES) await notes.createIndex(key, { name });
    await setNotesValidator(db, notesValidator(true));

    // Per-user counts from the notes as they are now.
    await notes.aggregate([
      { $match: { category_id: { $exists: true } } },
      { $group: { _id: { user_id: '$user_id', category_id: '$category_id' }, noteCount: { $sum: 1 } } },
      { $project: { _id: 0, user_id: '$_id.user_id', category_id: '$_id.category_id', noteCount: 1 } },
      { $merge: { into: 'user_categories', on: ['user_id', 'category_id'], whenMatched: 'replace', whenNotMatched: 'insert' } },
    ]).toArray();
    await notes.aggregate([
      { $unwind: '$tag_ids' },
      { $group: { _id: { user_id: '$user_id', tag_id: '$tag_ids' }, noteCount: { $sum: 1 } } },
      { $project: { _id: 0, user_id: '$_id.user_id', tag_id: '$_id.tag_id', noteCount: 1 } },
      { $merge: { into: 'user_tags', on: ['user_id', 'tag_id'], whenMatched: 'replace', whenNotMatched: 'insert' } },
    ]).toArray();
  }

  async down(db: Db): Promise<void> {
    const names = async (collection: string) =>
      new Map((await db.collection<{ _id: ObjectId; name: string }>(collection).find().toArray()).map((d) => [String(d._id), d.name]));
    const categoryNames = await names('categories');
    const tagNames = await names('tags');

    const notes = db.collection('notes');
    await setNotesValidator(db, null);
    for await (const note of notes.find()) {
      const set: Record<string, unknown> = {
        tags: ((note.tag_ids as ObjectId[] | undefined) ?? []).map((id) => tagNames.get(String(id))).filter(Boolean),
      };
      const category = note.category_id ? categoryNames.get(String(note.category_id)) : undefined;
      if (category) set.category = category;
      await notes.updateOne({ _id: note._id }, { $set: set, $unset: { category_id: '', tag_ids: '' } });
    }
    for (const { name } of NOTE_INDEXES) await notes.dropIndex(name).catch(() => undefined);
    await setNotesValidator(db, notesValidator(false));
    for (const { name } of NEW_COLLECTIONS) await db.collection(name).drop().catch(() => undefined);
  }
}
