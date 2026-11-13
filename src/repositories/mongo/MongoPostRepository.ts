import { injectable } from 'tsyringe';
import { type PostDocument, PostModel } from '../../domain/Post';
import type { NewPost, PostRepository } from '../PostRepository';

@injectable()
export class MongoPostRepository implements PostRepository {
  create(post: NewPost): Promise<PostDocument> {
    return PostModel.create(post);
  }
}
