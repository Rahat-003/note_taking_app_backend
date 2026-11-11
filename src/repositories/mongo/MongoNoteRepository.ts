import type { Types } from 'mongoose';
import { injectable } from 'tsyringe';
import { Page } from '../../common/pagination/Page';
import { PageRequest } from '../../common/pagination/PageRequest';
import { type NoteDocument, NoteModel, type NoteView } from '../../domain/Note';
import type { NewNote, NoteChanges, NoteRepository } from '../NoteRepository';

// The note's `user` virtual (user_id -> users) is populated with these fields.
const USER_FIELDS = 'name email';

@injectable()
export class MongoNoteRepository implements NoteRepository {
  async findByUser(userId: Types.ObjectId, page: PageRequest): Promise<Page<NoteView>> {
    const filter = { user_id: userId };
    const [data, total] = await Promise.all([this.findPage(filter, page), NoteModel.countDocuments(filter).exec()]);
    return Page.of(data, total, page);
  }

  async findAll(page: PageRequest): Promise<Page<NoteView>> {
    const [data, total] = await Promise.all([this.findPage({}, page), NoteModel.estimatedDocumentCount().exec()]);
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
    return NoteModel.findOneAndUpdate({ _id: id, user_id: userId }, { $set: changes }, { new: true, runValidators: true }).exec();
  }

  async deleteOwned(id: Types.ObjectId, userId: Types.ObjectId): Promise<boolean> {
    const { deletedCount } = await NoteModel.deleteOne({ _id: id, user_id: userId }).exec();
    return deletedCount > 0;
  }

  async deleteByUser(userId: Types.ObjectId): Promise<void> {
    await NoteModel.deleteMany({ user_id: userId }).exec();
  }

  private findPage(filter: { user_id?: Types.ObjectId }, page: PageRequest): Promise<NoteView[]> {
    return NoteModel.find(filter)
      .sort({ _id: -1 })
      .skip(page.skip)
      .limit(page.limit)
      .populate('user', USER_FIELDS)
      .lean<NoteView[]>()
      .exec();
  }
}
