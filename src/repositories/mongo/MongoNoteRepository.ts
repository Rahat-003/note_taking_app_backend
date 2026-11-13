import type { FilterQuery, Types, UpdateQuery } from 'mongoose';
import { injectable } from 'tsyringe';
import { Page } from '../../common/pagination/Page';
import { PageRequest } from '../../common/pagination/PageRequest';
import { type NoteDocument, type NoteEntity, NoteModel, type NoteView } from '../../domain/Note';
import type { NewNote, NoteChanges, NoteRepository, NoteSearchCriteria } from '../NoteRepository';

// Populates the note's virtuals: `user` (user_id -> users), `category` (category_id -> categories), `tags` (tag_ids -> tags).
const withReferences = <Q extends { populate: (...args: any[]) => Q }>(query: Q): Q =>
  query.populate('user', 'name email').populate('category', 'name').populate('tags', 'name');

@injectable()
export class MongoNoteRepository implements NoteRepository {
  async search(criteria: NoteSearchCriteria, page: PageRequest): Promise<Page<NoteView>> {
    const filter: FilterQuery<NoteEntity> = {};
    if (criteria.userId) filter.user_id = criteria.userId;
    if (criteria.isArchived !== undefined) filter.isArchived = criteria.isArchived;
    if (criteria.categoryId) filter.category_id = criteria.categoryId;
    if (criteria.tagId) filter.tag_ids = criteria.tagId;
    if (criteria.text) filter.$text = { $search: criteria.text };

    const direction = criteria.order === 'asc' ? 1 : -1;
    // Created-date order is _id order (ObjectIds embed their creation time), so it reuses the _id-based indexes.
    const byDate: Record<string, 1 | -1> = criteria.sort === 'updatedAt' ? { updatedAt: direction } : { _id: direction };
    let sort: Record<string, 1 | -1>;
    if (criteria.sort === 'archivedAt') {
      // The archive (one user, isArchived: true): the partial { user_id, archivedAt, _id } index. Archived notes are never pinned.
      sort = { archivedAt: direction, _id: direction };
    } else {
      // In one user's list, pinned notes come first, most recently pinned first (null = not pinned sorts last).
      // Pins are personal, so a list across users keeps plain date order.
      sort = criteria.userId ? { pinned_at: -1, ...byDate } : byDate;
    }

    const [data, total] = await Promise.all([
      withReferences(NoteModel.find(filter).sort(sort).skip(page.skip).limit(page.limit)).lean<NoteView[]>().exec(),
      this.count(filter, criteria),
    ]);
    return Page.of(data, total, page);
  }

  findOne(id: Types.ObjectId, userId?: Types.ObjectId): Promise<NoteView | null> {
    return withReferences(NoteModel.findOne(userId ? { _id: id, user_id: userId } : { _id: id })).lean<NoteView>().exec();
  }

  findOwnedEntity(id: Types.ObjectId, userId: Types.ObjectId): Promise<NoteEntity | null> {
    return NoteModel.findOne({ _id: id, user_id: userId }).lean<NoteEntity>().exec();
  }

  create(note: NewNote): Promise<NoteDocument> {
    return NoteModel.create(note);
  }

  updateOwned(id: Types.ObjectId, userId: Types.ObjectId, changes: NoteChanges): Promise<NoteDocument | null> {
    const { category_id: categoryId, ...fields } = changes;
    const set: Partial<NoteEntity> = categoryId ? { ...fields, category_id: categoryId } : fields;
    const update: UpdateQuery<NoteEntity> = {};
    if (Object.keys(set).length) update.$set = set;
    if (categoryId === null) update.$unset = { category_id: 1 };
    // Pinning / archiving is not an edit of the note: updatedAt only moves when its content changes.
    const edited = Object.keys(changes).some((key) => !['pinned_at', 'isArchived', 'archivedAt'].includes(key));
    return NoteModel.findOneAndUpdate({ _id: id, user_id: userId }, update, { new: true, runValidators: true, timestamps: edited }).exec();
  }

  deleteOwned(id: Types.ObjectId, userId: Types.ObjectId): Promise<NoteEntity | null> {
    return NoteModel.findOneAndDelete({ _id: id, user_id: userId }).lean<NoteEntity>().exec();
  }

  async deleteByUser(userId: Types.ObjectId): Promise<void> {
    await NoteModel.deleteMany({ user_id: userId }).exec();
  }

  private count(filter: FilterQuery<NoteEntity>, criteria: NoteSearchCriteria): Promise<number> {
    if (!Object.keys(filter).length) return NoteModel.estimatedDocumentCount().exec(); // metadata, no scan
    // With a user or text condition the planner picks the matching index. A cross-user filter on
    // isArchived / category / tag alone has no index of its own, so walk the _id index instead of the collection.
    const query = NoteModel.countDocuments(filter);
    return (criteria.userId || criteria.text ? query : query.hint({ _id: 1 })).exec();
  }
}
