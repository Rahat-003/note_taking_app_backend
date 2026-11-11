import type { Types } from 'mongoose';
import { injectable } from 'tsyringe';
import { Page } from '../../common/pagination/Page';
import { PageRequest } from '../../common/pagination/PageRequest';
import { type NoteDocument, NoteModel, type NoteView } from '../../domain/Note';
import type { NewNote, NoteChanges, NoteRepository } from '../NoteRepository';

const OWNER_FIELDS = 'name email';

@injectable()
export class MongoNoteRepository implements NoteRepository {
  async findByOwner(ownerId: Types.ObjectId, page: PageRequest): Promise<Page<NoteView>> {
    const filter = { owner: ownerId };
    const [data, total] = await Promise.all([this.findPage(filter, page), NoteModel.countDocuments(filter).exec()]);
    return Page.of(data, total, page);
  }

  async findAll(page: PageRequest): Promise<Page<NoteView>> {
    const [data, total] = await Promise.all([this.findPage({}, page), NoteModel.estimatedDocumentCount().exec()]);
    return Page.of(data, total, page);
  }

  findOne(id: Types.ObjectId, owner?: Types.ObjectId): Promise<NoteView | null> {
    return NoteModel.findOne(owner ? { _id: id, owner } : { _id: id })
      .populate('owner', OWNER_FIELDS)
      .lean<NoteView>()
      .exec();
  }

  create(note: NewNote): Promise<NoteDocument> {
    return NoteModel.create(note);
  }

  updateOwned(id: Types.ObjectId, owner: Types.ObjectId, changes: NoteChanges): Promise<NoteDocument | null> {
    return NoteModel.findOneAndUpdate({ _id: id, owner }, { $set: changes }, { new: true, runValidators: true }).exec();
  }

  async deleteOwned(id: Types.ObjectId, owner: Types.ObjectId): Promise<boolean> {
    const { deletedCount } = await NoteModel.deleteOne({ _id: id, owner }).exec();
    return deletedCount > 0;
  }

  async deleteByOwner(ownerId: Types.ObjectId): Promise<void> {
    await NoteModel.deleteMany({ owner: ownerId }).exec();
  }

  private findPage(filter: { owner?: Types.ObjectId }, page: PageRequest): Promise<NoteView[]> {
    return NoteModel.find(filter)
      .sort({ _id: -1 })
      .skip(page.skip)
      .limit(page.limit)
      .populate('owner', OWNER_FIELDS)
      .lean<NoteView[]>()
      .exec();
  }
}
