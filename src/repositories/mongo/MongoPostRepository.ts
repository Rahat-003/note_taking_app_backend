import type { Types } from 'mongoose';
import { injectable } from 'tsyringe';
import { Page } from '../../common/pagination/Page';
import { PageRequest } from '../../common/pagination/PageRequest';
import { type PostDocument, PostModel, type PostView } from '../../domain/Post';
import type { NewPost, PostRepository } from '../PostRepository';

// The post's `user` virtual (user_id -> users) is populated with these fields.
const USER_FIELDS = 'name';

@injectable()
export class MongoPostRepository implements PostRepository {
  async findAll(page: PageRequest): Promise<Page<PostView>> {
    const [data, total] = await Promise.all([
      PostModel.find()
        .sort({ _id: -1 })
        .skip(page.skip)
        .limit(page.limit)
        .populate('user', USER_FIELDS)
        .lean<PostView[]>()
        .exec(),
      PostModel.estimatedDocumentCount().exec(),
    ]);
    return Page.of(data, total, page);
  }

  findById(id: Types.ObjectId): Promise<PostView | null> {
    return PostModel.findById(id).populate('user', USER_FIELDS).lean<PostView>().exec();
  }

  create(post: NewPost): Promise<PostDocument> {
    return PostModel.create(post);
  }

  async delete(id: Types.ObjectId, userId?: Types.ObjectId): Promise<boolean> {
    const { deletedCount } = await PostModel.deleteOne(userId ? { _id: id, user_id: userId } : { _id: id }).exec();
    return deletedCount > 0;
  }

  async deleteByUser(userId: Types.ObjectId): Promise<void> {
    await PostModel.deleteMany({ user_id: userId }).exec();
  }
}
