import type { Types } from 'mongoose';
import type { Page } from '../common/pagination/Page';
import type { PageRequest } from '../common/pagination/PageRequest';
import type { CategoryEntity } from '../domain/Category';
import type { UserLabel } from '../domain/Label';
import type { Principal } from './Principal';

export interface CategoryService {
  /** Every category, by name. */
  list(page: PageRequest): Promise<Page<CategoryEntity>>;
  /** The caller's categories with their note counts (user_categories). */
  listMine(principal: Principal, page: PageRequest): Promise<Page<UserLabel>>;
  /** Creates the category, or returns the existing one with that name. */
  create(name: string): Promise<{ category: CategoryEntity; created: boolean }>;
  /** Parses a category id from a request; 400 when it is malformed or no such category exists. */
  requireExisting(categoryId: string): Promise<Types.ObjectId>;
  /** Moves one note of the user from category `before` to category `after` in the user's counts. */
  recordUsage(userId: Types.ObjectId, before: Types.ObjectId | undefined, after: Types.ObjectId | undefined): Promise<void>;
}
