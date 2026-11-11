import type { Request } from 'express';
import { UnauthorizedException } from '../common/exceptions/UnauthorizedException';
import { PageRequest } from '../common/pagination/PageRequest';
import type { Principal } from '../services/Principal';

export abstract class BaseController {
  protected principal(req: Request): Principal {
    if (!req.principal) throw new UnauthorizedException();
    return req.principal;
  }

  protected pageRequest(req: Request): PageRequest {
    return PageRequest.fromQuery(req.query);
  }

  /** The DTO instance that validateBody() put on req.body. */
  protected body<T>(req: Request): T {
    return req.body as T;
  }

  protected param(req: Request, name: string): string {
    return req.params[name] ?? '';
  }
}
