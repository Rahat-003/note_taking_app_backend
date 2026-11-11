import type { Types } from 'mongoose';
import { injectable } from 'tsyringe';
import { Page } from '../../common/pagination/Page';
import { PageRequest } from '../../common/pagination/PageRequest';
import { type PostDocument, PostModel, type PostView } from '../../domain/Post';
import type { NewPost, PostRepository } from '../PostRepository';

const AUTHOR_FIELDS = 'name';

@injectable()
export class MongoPostRepository implements PostRepository {
  async findAll(page: PageRequest): Promise<Page<PostView>> {
    const [data, total] = await Promise.all([
      PostModel.find()
        .sort({ _id: -1 })
        .skip(page.skip)
        .limit(page.limit)
        .populate('author', AUTHOR_FIELDS)
        .lean<PostView[]>()
        .exec(),
      PostModel.estimatedDocumentCount().exec(),
    ]);
    return Page.of(data, total, page);
  }

  findById(id: Types.ObjectId): Promise<PostView | null> {
    return PostModel.findById(id).populate('author', AUTHOR_FIELDS).lean<PostView>().exec();
  }

  create(post: NewPost): Promise<PostDocument> {
    return PostModel.create(post);
  }

  async delete(id: Types.ObjectId, author?: Types.ObjectId): Promise<boolean> {
    const { deletedCount } = await PostModel.deleteOne(author ? { _id: id, author } : { _id: id }).exec();
    return deletedCount > 0;
  }

  async deleteByAuthor(authorId: Types.ObjectId): Promise<void> {
    await PostModel.deleteMany({ author: authorId }).exec();
  }
}
