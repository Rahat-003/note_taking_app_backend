import type { Request, Response } from 'express';
import { inject, injectable } from 'tsyringe';
import { Tokens } from '../common/Tokens';
import type { CreatePostDto } from '../dto/post/CreatePostDto';
import type { PostService } from '../services/PostService';
import { BaseController } from './BaseController';

@injectable()
export class PostController extends BaseController {
  constructor(@inject(Tokens.PostService) private readonly posts: PostService) {
    super();
  }

  async create(req: Request, res: Response): Promise<void> {
    res.status(201).json(await this.posts.create(this.principal(req), this.body<CreatePostDto>(req)));
  }
}
