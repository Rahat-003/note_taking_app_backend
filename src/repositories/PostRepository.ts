import type { Types } from 'mongoose';
import type { PostDocument } from '../domain/Post';

export interface NewPost {
  user_id: Types.ObjectId;
  title: string;
  body: string;
}

/** Writes posts. Reading a user's posts is Scenario 2: UserRepository.findWithPosts ($lookup). */
export interface PostRepository {
  create(post: NewPost): Promise<PostDocument>;
}
