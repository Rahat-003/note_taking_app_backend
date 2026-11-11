import { Types, isValidObjectId } from 'mongoose';
import { BadRequestException } from './exceptions/BadRequestException';

export class ObjectIds {
  private constructor() {}

  /** Parses a 24-char hex id from untrusted input; anything else is a 400. */
  static parse(id: unknown): Types.ObjectId {
    if (typeof id !== 'string' || !isValidObjectId(id) || String(new Types.ObjectId(id)) !== id) {
      throw new BadRequestException('Invalid id');
    }
    return new Types.ObjectId(id);
  }
}