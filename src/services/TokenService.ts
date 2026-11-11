import type { Types } from 'mongoose';

export interface TokenService {
  sign(userId: Types.ObjectId): string;
  /** Returns the user id carried by a valid token; throws 401 otherwise. */
  verify(token: string): Types.ObjectId;
}
