import type { Request, Response } from 'express';
import { inject, injectable } from 'tsyringe';
import { Tokens } from '../common/Tokens';
import type { CreateCategoryDto } from '../dto/note/CreateCategoryDto';
import type { CategoryService } from '../services/CategoryService';
import { BaseController } from './BaseController';

@injectable()
export class CategoryController extends BaseController {
  constructor(@inject(Tokens.CategoryService) private readonly categories: CategoryService) {
    super();
  }

  async list(req: Request, res: Response): Promise<void> {
    res.json(await this.categories.list(this.pageRequest(req)));
  }

  async mine(req: Request, res: Response): Promise<void> {
    res.json(await this.categories.listMine(this.principal(req), this.pageRequest(req)));
  }

  /** 201 when the category was created, 200 when one with that name already existed. */
  async create(req: Request, res: Response): Promise<void> {
    const { category, created } = await this.categories.create(this.body<CreateCategoryDto>(req).name);
    res.status(created ? 201 : 200).json(category);
  }
}
