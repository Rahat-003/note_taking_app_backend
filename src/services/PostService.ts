import type { Page } from '../common/pagination/Page';
import type { PageRequest } from '../common/pagination/PageRequest';
import type { PostDocument, PostView } from '../domain/Post';
import type { CreatePostDto } from '../dto/post/CreatePostDto';
import type { Principal } from './Principal';

export interface PostService {
  list(page: PageRequest): Promise<Page<PostView>>;
  get(postId: string): Promise<PostView>;
  create(principal: Principal, dto: CreatePostDto): Promise<PostDocument>;
  delete(principal: Principal, postId: string): Promise<void>;
}
