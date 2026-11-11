import type { Request, Response } from 'express';
import { inject, injectable } from 'tsyringe';
import { Tokens } from '../common/Tokens';
import type { TagService } from '../services/TagService';
import { BaseController } from './BaseController';

@injectable()
export class TagController extends BaseController {
  constructor(@inject(Tokens.TagService) private readonly tags: TagService) {
    super();
  }

  async list(req: Request, res: Response): Promise<void> {
    res.json(await this.tags.list(this.pageRequest(req)));
  }

  async mine(req: Request, res: Response): Promise<void> {
    res.json(await this.tags.listMine(this.principal(req), this.pageRequest(req)));
  }
}
