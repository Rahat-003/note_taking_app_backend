import type { FilterQuery, Types, UpdateQuery } from 'mongoose';
import { injectable } from 'tsyringe';
import { Page } from '../../common/pagination/Page';
import { PageRequest } from '../../common/pagination/PageRequest';
import { type NoteDocument, type NoteEntity, NoteModel, type NoteView } from '../../domain/Note';
import type { NewNote, NoteChanges, NoteRepository, NoteSearchCriteria } from '../NoteRepository';

// The note's `user` virtual (user_id -> users) is populated with these fields.
const USER_FIELDS = 'name email';

@injectable()
export class MongoNoteRepository implements NoteRepository {
  async search(criteria: NoteSearchCriteria, page: PageRequest): Promise<Page<NoteView>> {
    const filter: FilterQuery<NoteEntity> = {};
    if (criteria.userId) filter.user_id = criteria.userId;
    if (criteria.status) filter.status = criteria.status;
    if (criteria.category) filter.category = criteria.category;
    if (criteria.tag) filter.tags = criteria.tag;
    if (criteria.text) filter.$text = { $search: criteria.text };

    const direction = criteria.order === 'asc' ? 1 : -1;
    // Created-date order is _id order (ObjectIds embed their creation time), so it reuses the _id-based indexes.
    const sort: Record<string, 1 | -1> = criteria.sort === 'updatedAt' ? { updatedAt: direction } : { _id: direction };

    const [data, total] = await Promise.all([
      NoteModel.find(filter)
        .sort(sort)
        .skip(page.skip)
        .limit(page.limit)
        .populate('user', USER_FIELDS)
        .lean<NoteView[]>()
        .exec(),
      this.count(filter, criteria),
    ]);
    return Page.of(data, total, page);
  }

  findOne(id: Types.ObjectId, userId?: Types.ObjectId): Promise<NoteView | null> {
    return NoteModel.findOne(userId ? { _id: id, user_id: userId } : { _id: id })
      .populate('user', USER_FIELDS)
      .lean<NoteView>()
      .exec();
  }

  create(note: NewNote): Promise<NoteDocument> {
    return NoteModel.create(note);
  }

  updateOwned(id: Types.ObjectId, userId: Types.ObjectId, changes: NoteChanges): Promise<NoteDocument | null> {
    const { category, ...fields } = changes;
    const set: Partial<NoteEntity> = category ? { ...fields, category } : fields;
    const update: UpdateQuery<NoteEntity> = {};
    if (Object.keys(set).length) update.$set = set;
    if (category === '') update.$unset = { category: 1 }; // an empty string removes the category
    return NoteModel.findOneAndUpdate({ _id: id, user_id: userId }, update, { new: true, runValidators: true }).exec();
  }

  async deleteOwned(id: Types.ObjectId, userId: Types.ObjectId): Promise<boolean> {
    const { deletedCount } = await NoteModel.deleteOne({ _id: id, user_id: userId }).exec();
    return deletedCount > 0;
  }

  async deleteByUser(userId: Types.ObjectId): Promise<void> {
    await NoteModel.deleteMany({ user_id: userId }).exec();
  }

  private count(filter: FilterQuery<NoteEntity>, criteria: NoteSearchCriteria): Promise<number> {
    if (!Object.keys(filter).length) return NoteModel.estimatedDocumentCount().exec(); // metadata, no scan
    // With a user or text condition the planner picks the matching index. A cross-user filter on
    // status / category / tag alone has no index of its own, so walk the _id index instead of the collection.
    const query = NoteModel.countDocuments(filter);
    return (criteria.userId || criteria.text ? query : query.hint({ _id: 1 })).exec();
  }
}
