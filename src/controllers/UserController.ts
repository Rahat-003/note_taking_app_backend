import type { Request, Response } from 'express';
import { inject, injectable } from 'tsyringe';
import { Tokens } from '../common/Tokens';
import type { CreateUserDto } from '../dto/user/CreateUserDto';
import type { UpdateUserDto } from '../dto/user/UpdateUserDto';
import type { UserQueryDto } from '../dto/user/UserQueryDto';
import type { UserStatusDto } from '../dto/user/UserStatusDto';
import type { UserService } from '../services/UserService';
import { BaseController } from './BaseController';

@injectable()
export class UserController extends BaseController {
  constructor(@inject(Tokens.UserService) private readonly users: UserService) {
    super();
  }

  /** Aggregation Scenario 1. */
  async interests(req: Request, res: Response): Promise<void> {
    const interest = typeof req.query.interest === 'string' ? req.query.interest : '';
    res.json(await this.users.groupByInterest(interest, this.pageRequest(req)));
  }

  async list(req: Request, res: Response): Promise<void> {
    res.json(await this.users.list(this.pageRequest(req), this.query<UserQueryDto>(req).q));
  }

  async get(req: Request, res: Response): Promise<void> {
    res.json(await this.users.get(this.param(req, 'id')));
  }

  async create(req: Request, res: Response): Promise<void> {
    res.status(201).json(await this.users.create(this.principal(req), this.body<CreateUserDto>(req)));
  }

  async update(req: Request, res: Response): Promise<void> {
    res.json(await this.users.update(this.principal(req), this.param(req, 'id'), this.body<UpdateUserDto>(req)));
  }

  async setStatus(req: Request, res: Response): Promise<void> {
    res.json(await this.users.setStatus(this.principal(req), this.param(req, 'id'), this.body<UserStatusDto>(req)));
  }

  async delete(req: Request, res: Response): Promise<void> {
    await this.users.delete(this.principal(req), this.param(req, 'id'));
    res.status(204).end();
  }
}
