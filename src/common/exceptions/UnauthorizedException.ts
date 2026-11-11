import { HttpException } from './HttpException';

export class UnauthorizedException extends HttpException {
  constructor(message = 'Authentication required') {
    super(401, message);
  }
}
