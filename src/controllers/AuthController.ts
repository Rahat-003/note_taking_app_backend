import type { Request, Response } from 'express';
import { inject, injectable } from 'tsyringe';
import { Tokens } from '../common/Tokens';
import type { LoginDto } from '../dto/auth/LoginDto';
import type { RegisterDto } from '../dto/auth/RegisterDto';
import type { UpdateProfileDto } from '../dto/auth/UpdateProfileDto';
import type { AuthService } from '../services/AuthService';
import { BaseController } from './BaseController';

@injectable()
export class AuthController extends BaseController {
  constructor(@inject(Tokens.AuthService) private readonly auth: AuthService) {
    super();
  }

  async register(req: Request, res: Response): Promise<void> {
    res.status(201).json(await this.auth.register(this.body<RegisterDto>(req)));
  }

  async login(req: Request, res: Response): Promise<void> {
    res.json(await this.auth.login(this.body<LoginDto>(req)));
  }

  async me(req: Request, res: Response): Promise<void> {
    res.json(this.auth.getSession(this.principal(req)));
  }

  async updateMe(req: Request, res: Response): Promise<void> {
    res.json(await this.auth.updateProfile(this.principal(req), this.body<UpdateProfileDto>(req)));
  }
}
