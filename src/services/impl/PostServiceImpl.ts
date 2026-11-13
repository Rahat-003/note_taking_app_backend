import { inject, injectable } from 'tsyringe';
import { NotFoundException } from '../../common/exceptions/NotFoundException';
import { ObjectIds } from '../../common/ObjectIds';
import { PermissionKey } from '../../common/PermissionKey';
import { Tokens } from '../../common/Tokens';
import type { Page } from '../../common/pagination/Page';
import type { PageRequest } from '../../common/pagination/PageRequest';
import type { PostDocument, PostView } from '../../domain/Post';
import type { CreatePostDto } from '../../dto/post/CreatePostDto';
import type { UpdatePostDto } from '../../dto/post/UpdatePostDto';
import type { PostRepository } from '../../repositories/PostRepository';
import type { PostService } from '../PostService';
import type { Principal } from '../Principal';

@injectable()
export class PostServiceImpl implements PostService {
  constructor(@inject(Tokens.PostRepository) private readonly posts: PostRepository) {}

  create(principal: Principal, dto: CreatePostDto): Promise<PostDocument> {
    return this.posts.create({ user_id: principal.id, title: dto.title, body: dto.body });
  }

  async update(principal: Principal, postId: string, dto: UpdatePostDto): Promise<PostDocument> {
    const changes = Object.fromEntries(Object.entries({ title: dto.title, body: dto.body }).filter(([, v]) => v !== undefined));
    const post = await this.posts.updateOwned(ObjectIds.parse(postId), principal.id, changes);
    if (!post) throw new NotFoundException('Post not found');
    return post;
  }

  async delete(principal: Principal, postId: string): Promise<void> {
    // posts.delete_any: any post; otherwise only your own (someone else's is reported as 404).
    const authorId = principal.can(PermissionKey.POSTS_DELETE_ANY) ? undefined : principal.id;
    if (!(await this.posts.delete(ObjectIds.parse(postId), authorId))) throw new NotFoundException('Post not found');
  }

  list(page: PageRequest): Promise<Page<PostView>> {
    return this.posts.findAll(page);
  }
}
