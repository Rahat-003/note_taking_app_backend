import type { Page } from '../common/pagination/Page';
import type { PageRequest } from '../common/pagination/PageRequest';
import type { PostDocument, PostView } from '../domain/Post';
import type { CreatePostDto } from '../dto/post/CreatePostDto';
import type { UpdatePostDto } from '../dto/post/UpdatePostDto';
import type { Principal } from './Principal';

export interface PostService {
  /** The post is written by the signed-in user. */
  create(principal: Principal, dto: CreatePostDto): Promise<PostDocument>;
  /** Only the author can change a post; someone else's post is reported as 404. */
  update(principal: Principal, postId: string, dto: UpdatePostDto): Promise<PostDocument>;
  /** The author (posts.delete_own) or anyone with posts.delete_any (admins) can delete a post. */
  delete(principal: Principal, postId: string): Promise<void>;
  /** Everyone's posts, newest first: posts are visible to every signed-in user. */
  list(page: PageRequest): Promise<Page<PostView>>;
}
