import { IsString, MaxLength } from 'class-validator';
import { Optional, Trim } from '../decorators';

/** Query string of GET /api/users (page / limit are read by PageRequest). Empty values count as absent. */
export class UserQueryDto {
  /** Users whose email starts with this (case-insensitive). */
  @Optional() @Trim() @IsString() @MaxLength(100)
  q?: string;
}
