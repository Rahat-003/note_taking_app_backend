import type { Types } from 'mongoose';
import type { Page } from '../common/pagination/Page';
import type { PageRequest } from '../common/pagination/PageRequest';
import type { PostDocument, PostView } from '../domain/Post';

export interface NewPost {
  author: Types.ObjectId;
  title: string;
  body: string;
}

export interface PostRepository {
  /** Newest first via the _id index; total from collection metadata. */
  findAll(page: PageRequest): Promise<Page<PostView>>;
  /** _id index. */
  findById(id: Types.ObjectId): Promise<PostView | null>;
  create(post: NewPost): Promise<PostDocument>;
  /** _id index; when author is given the post must also be theirs. Returns false when nothing matched. */
  delete(id: Types.ObjectId, author?: Types.ObjectId): Promise<boolean>;
  /** { author: 1, _id: -1 }. */
  deleteByAuthor(authorId: Types.ObjectId): Promise<void>;
}
