import { inject, injectable } from 'tsyringe';
import { NotFoundException } from '../../common/exceptions/NotFoundException';
import { ObjectIds } from '../../common/ObjectIds';
import type { Page } from '../../common/pagination/Page';
import type { PageRequest } from '../../common/pagination/PageRequest';
import { PermissionKey } from '../../common/PermissionKey';
import { Tokens } from '../../common/Tokens';
import type { PostDocument, PostView } from '../../domain/Post';
import type { CreatePostDto } from '../../dto/post/CreatePostDto';
import type { PostRepository } from '../../repositories/PostRepository';
import type { PostService } from '../PostService';
import type { Principal } from '../Principal';

@injectable()
export class PostServiceImpl implements PostService {
  constructor(@inject(Tokens.PostRepository) private readonly posts: PostRepository) {}

  list(page: PageRequest): Promise<Page<PostView>> {
    return this.posts.findAll(page);
  }

  async get(postId: string): Promise<PostView> {
    const post = await this.posts.findById(ObjectIds.parse(postId));
    if (!post) throw new NotFoundException('Post not found');
    return post;
  }

  create(principal: Principal, dto: CreatePostDto): Promise<PostDocument> {
    return this.posts.create({ title: dto.title, body: dto.body, user_id: principal.id });
  }

  /** Authors can always delete their own posts; posts.delete_any can delete anyone's. */
  async delete(principal: Principal, postId: string): Promise<void> {
    const userId = principal.can(PermissionKey.POSTS_DELETE_ANY) ? undefined : principal.id;
    if (!(await this.posts.delete(ObjectIds.parse(postId), userId))) throw new NotFoundException('Post not found');
  }
}
