import type { Principal } from '../services/Principal';

declare global {
  namespace Express {
    interface Request {
      /** Set by AuthenticationMiddleware on authenticated routes. */
      principal?: Principal;
      /** Set by validateQuery(): the validated query DTO. */
      validatedQuery?: object;
    }
  }
}

export {};
