import type { Types } from 'mongoose';
import { injectable } from 'tsyringe';
import { Page } from '../../common/pagination/Page';
import type { PageRequest } from '../../common/pagination/PageRequest';
import { type PostDocument, PostModel, type PostView } from '../../domain/Post';
import type { NewPost, PostRepository } from '../PostRepository';

@injectable()
export class MongoPostRepository implements PostRepository {
  create(post: NewPost): Promise<PostDocument> {
    return PostModel.create(post);
  }

  updateOwned(id: Types.ObjectId, userId: Types.ObjectId, changes: Partial<Pick<NewPost, 'title' | 'body'>>): Promise<PostDocument | null> {
    return PostModel.findOneAndUpdate({ _id: id, user_id: userId }, { $set: changes }, { new: true, runValidators: true }).exec();
  }

  async delete(id: Types.ObjectId, userId?: Types.ObjectId): Promise<boolean> {
    const { deletedCount } = await PostModel.deleteOne(userId ? { _id: id, user_id: userId } : { _id: id }).exec();
    return deletedCount > 0;
  }

  async deleteByUser(userId: Types.ObjectId): Promise<void> {
    await PostModel.deleteMany({ user_id: userId }).exec();
  }

  async findAll(page: PageRequest): Promise<Page<PostView>> {
    const [data, total] = await Promise.all([
      PostModel.find().sort({ _id: -1 }).skip(page.skip).limit(page.limit).populate('user', 'name').lean<PostView[]>().exec(),
      PostModel.estimatedDocumentCount().exec(),
    ]);
    return Page.of(data, total, page);
  }
}
