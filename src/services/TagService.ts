import type { Types } from 'mongoose';
import type { Page } from '../common/pagination/Page';
import type { PageRequest } from '../common/pagination/PageRequest';
import type { UserLabel } from '../domain/Label';
import type { TagEntity } from '../domain/Tag';
import type { Principal } from './Principal';

export interface TagService {
  /** Every tag, by name. */
  list(page: PageRequest): Promise<Page<TagEntity>>;
  /** The caller's tags with their note counts (user_tags). */
  listMine(principal: Principal, page: PageRequest): Promise<Page<UserLabel>>;
  /** Tag ids for these names, creating tags that do not exist yet. */
  idsForNames(names: readonly string[]): Promise<Types.ObjectId[]>;
  /** Moves one note of the user from the tag set `before` to `after` in the user's counts. */
  recordUsage(userId: Types.ObjectId, before: readonly Types.ObjectId[], after: readonly Types.ObjectId[]): Promise<void>;
}
