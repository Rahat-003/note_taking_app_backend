import type { Types } from 'mongoose';
import type { Page } from '../common/pagination/Page';
import type { PageRequest } from '../common/pagination/PageRequest';
import type { PostDocument, PostView } from '../domain/Post';

export interface NewPost {
  user_id: Types.ObjectId;
  title: string;
  body: string;
}

export interface PostRepository {
  /** Newest first via the _id index; total from collection metadata. */
  findAll(page: PageRequest): Promise<Page<PostView>>;
  /** _id index. */
  findById(id: Types.ObjectId): Promise<PostView | null>;
  create(post: NewPost): Promise<PostDocument>;
  /** _id index; when userId is given the post must also be that user's. Returns false when nothing matched. */
  delete(id: Types.ObjectId, userId?: Types.ObjectId): Promise<boolean>;
  /** { user_id: 1, _id: -1 }. */
  deleteByUser(userId: Types.ObjectId): Promise<void>;
}
