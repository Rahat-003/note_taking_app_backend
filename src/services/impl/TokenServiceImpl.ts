import jwt from 'jsonwebtoken';
import { Types, isValidObjectId } from 'mongoose';
import { inject, injectable } from 'tsyringe';
import { UnauthorizedException } from '../../common/exceptions/UnauthorizedException';
import { AppConfig } from '../../config/AppConfig';
import type { TokenService } from '../TokenService';

/** HS256 JWTs carrying only the user id (sub); everything else is loaded fresh per request. */
@injectable()
export class TokenServiceImpl implements TokenService {
  constructor(@inject(AppConfig) private readonly config: AppConfig) {}

  sign(userId: Types.ObjectId): string {
    return jwt.sign({ sub: String(userId) }, this.config.jwtSecret, {
      algorithm: 'HS256',
      expiresIn: this.config.jwtExpiresIn,
    });
  }

  verify(token: string): Types.ObjectId {
    let payload: string | jwt.JwtPayload;
    try {
      payload = jwt.verify(token, this.config.jwtSecret, { algorithms: ['HS256'] });
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
    const sub = typeof payload === 'string' ? undefined : payload.sub;
    if (!sub || !isValidObjectId(sub)) throw new UnauthorizedException('Invalid token');
    return new Types.ObjectId(sub);
  }
}
