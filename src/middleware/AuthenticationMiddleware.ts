import type { RequestHandler } from 'express';
import { inject, injectable } from 'tsyringe';
import { UnauthorizedException } from '../common/exceptions/UnauthorizedException';
import { Tokens } from '../common/Tokens';
import type { AuthService } from '../services/AuthService';

/**
 * Verifies the bearer token and loads the user plus their role's permissions on every request,
 * so deleted users and permission changes take effect immediately.
 */
@injectable()
export class AuthenticationMiddleware {
  constructor(@inject(Tokens.AuthService) private readonly auth: AuthService) {}

  readonly handle: RequestHandler = (req, _res, next) => {
    const [scheme, token] = (req.headers.authorization ?? '').split(' ');
    if (scheme !== 'Bearer' || !token) return next(new UnauthorizedException('Authentication required'));
    this.auth.authenticate(token).then((principal) => {
      req.principal = principal;
      next();
    }, next);
  };
}
