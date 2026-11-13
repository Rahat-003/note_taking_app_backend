import type { Types } from 'mongoose';
import type { Page } from '../common/pagination/Page';
import type { PageRequest } from '../common/pagination/PageRequest';
import type { PostDocument, PostView } from '../domain/Post';

export interface NewPost {
  user_id: Types.ObjectId;
  title: string;
  body: string;
}

/** One user's posts are Scenario 2: UserRepository.findWithPosts ($lookup). */
export interface PostRepository {
  create(post: NewPost): Promise<PostDocument>;
  /** _id index; only the author's post matches. Returns the updated post, or null when none matched. */
  updateOwned(id: Types.ObjectId, userId: Types.ObjectId, changes: Partial<Pick<NewPost, 'title' | 'body'>>): Promise<PostDocument | null>;
  /** _id index; with userId only that author's post is deleted, without it any post. false when none matched. */
  delete(id: Types.ObjectId, userId?: Types.ObjectId): Promise<boolean>;
  /** Cascade when a user is removed: { user_id: 1, _id: -1 }. */
  deleteByUser(userId: Types.ObjectId): Promise<void>;
  /** Everyone's posts, newest first, via the _id index; the author populated; total from collection metadata. */
  findAll(page: PageRequest): Promise<Page<PostView>>;
}
