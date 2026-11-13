import { inject, injectable } from 'tsyringe';
import { Tokens } from '../../common/Tokens';
import type { PostDocument } from '../../domain/Post';
import type { CreatePostDto } from '../../dto/post/CreatePostDto';
import type { PostRepository } from '../../repositories/PostRepository';
import type { PostService } from '../PostService';
import type { Principal } from '../Principal';

@injectable()
export class PostServiceImpl implements PostService {
  constructor(@inject(Tokens.PostRepository) private readonly posts: PostRepository) {}

  create(principal: Principal, dto: CreatePostDto): Promise<PostDocument> {
    return this.posts.create({ user_id: principal.id, title: dto.title, body: dto.body });
  }
}
