// Fewer indexes (the task asks for none beyond what its queries strictly need):
//   notes { user_id, category_id, pinned_at, _id } and { user_id, tag_ids, pinned_at, _id }: a category or
//     tag filter is applied to one user's notes, which the user_id indexes already narrow down to.
//   users { name: 1 }: the user search now matches the email prefix only, served by { email: 1 }.
// down() rebuilds the three indexes.
import type { mongo } from 'mongoose';
import type { Migration } from '../src/database/Migration';

const INDEXES: Array<{ collection: string; name: string; key: Record<string, 1 | -1> }> = [
  { collection: 'notes', name: 'user_id_1_category_id_1_pinned_at_-1__id_-1', key: { user_id: 1, category_id: 1, pinned_at: -1, _id: -1 } },
  { collection: 'notes', name: 'user_id_1_tag_ids_1_pinned_at_-1__id_-1', key: { user_id: 1, tag_ids: 1, pinned_at: -1, _id: -1 } },
  { collection: 'users', name: 'name_1', key: { name: 1 } },
];

export default class DropCategoryTagNameIndexes implements Migration {
  async up(db: mongo.Db): Promise<void> {
    for (const index of INDEXES) await db.collection(index.collection).dropIndex(index.name).catch(() => undefined);
  }

  async down(db: mongo.Db): Promise<void> {
    for (const index of INDEXES) await db.collection(index.collection).createIndex(index.key, { name: index.name });
  }
}
