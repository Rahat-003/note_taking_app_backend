import type { Request, Response } from 'express';
import { inject, injectable } from 'tsyringe';
import { Tokens } from '../common/Tokens';
import type { CreateRoleDto } from '../dto/role/CreateRoleDto';
import type { UpdateRoleDto } from '../dto/role/UpdateRoleDto';
import type { RoleService } from '../services/RoleService';
import { BaseController } from './BaseController';

@injectable()
export class RoleController extends BaseController {
  constructor(@inject(Tokens.RoleService) private readonly roles: RoleService) {
    super();
  }

  async list(req: Request, res: Response): Promise<void> {
    res.json(await this.roles.list(this.pageRequest(req)));
  }

  async get(req: Request, res: Response): Promise<void> {
    res.json(await this.roles.get(this.param(req, 'id')));
  }

  async create(req: Request, res: Response): Promise<void> {
    res.status(201).json(await this.roles.create(this.principal(req), this.body<CreateRoleDto>(req)));
  }

  async update(req: Request, res: Response): Promise<void> {
    res.json(await this.roles.update(this.principal(req), this.param(req, 'id'), this.body<UpdateRoleDto>(req)));
  }

  async delete(req: Request, res: Response): Promise<void> {
    await this.roles.delete(this.param(req, 'id'));
    res.status(204).end();
  }
}
