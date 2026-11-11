import type { Request, Response } from 'express';
import { inject, injectable } from 'tsyringe';
import { Tokens } from '../common/Tokens';
import type { PermissionService } from '../services/PermissionService';
import { BaseController } from './BaseController';

@injectable()
export class PermissionController extends BaseController {
  constructor(@inject(Tokens.PermissionService) private readonly permissions: PermissionService) {
    super();
  }

  async list(req: Request, res: Response): Promise<void> {
    res.json(await this.permissions.list(this.pageRequest(req)));
  }
}
