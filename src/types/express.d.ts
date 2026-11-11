import type { Principal } from '../services/Principal';

declare global {
  namespace Express {
    interface Request {
      /** Set by AuthenticationMiddleware on authenticated routes. */
      principal?: Principal;
    }
  }
}

export {};
