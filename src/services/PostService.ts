import type { PostDocument } from '../domain/Post';
import type { CreatePostDto } from '../dto/post/CreatePostDto';
import type { Principal } from './Principal';

export interface PostService {
  /** The post is written by the signed-in user. */
  create(principal: Principal, dto: CreatePostDto): Promise<PostDocument>;
}
