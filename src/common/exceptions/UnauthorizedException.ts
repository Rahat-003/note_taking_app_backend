import { HttpException } from './HttpException';

/** code: UNAUTHORIZED by default; TOKEN_EXPIRED / ACCOUNT_DISABLED tell the client why the session ended. */
export class UnauthorizedException extends HttpException {
  constructor(message = 'Authentication required', code = 'UNAUTHORIZED') {
    super(401, message, { code });
  }
}
