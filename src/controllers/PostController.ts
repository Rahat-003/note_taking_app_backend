import type { Request, Response } from 'express';
import { inject, injectable } from 'tsyringe';
import { Tokens } from '../common/Tokens';
import type { CreatePostDto } from '../dto/post/CreatePostDto';
import type { UpdatePostDto } from '../dto/post/UpdatePostDto';
import type { PostService } from '../services/PostService';
import { BaseController } from './BaseController';

@injectable()
export class PostController extends BaseController {
  constructor(@inject(Tokens.PostService) private readonly posts: PostService) {
    super();
  }

  async list(req: Request, res: Response): Promise<void> {
    res.json(await this.posts.list(this.pageRequest(req)));
  }

  async create(req: Request, res: Response): Promise<void> {
    res.status(201).json(await this.posts.create(this.principal(req), this.body<CreatePostDto>(req)));
  }

  async update(req: Request, res: Response): Promise<void> {
    res.json(await this.posts.update(this.principal(req), this.param(req, 'id'), this.body<UpdatePostDto>(req)));
  }

  async delete(req: Request, res: Response): Promise<void> {
    await this.posts.delete(this.principal(req), this.param(req, 'id'));
    res.status(204).end();
  }
}
