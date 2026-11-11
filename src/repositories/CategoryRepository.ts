import type { Types } from 'mongoose';
import type { Page } from '../common/pagination/Page';
import type { PageRequest } from '../common/pagination/PageRequest';
import type { CategoryEntity } from '../domain/Category';

export interface CategoryRepository {
  /** Sorted by the { name: 1 } unique index; total from collection metadata. */
  findAll(page: PageRequest): Promise<Page<CategoryEntity>>;
  /** _id index. */
  findById(id: Types.ObjectId): Promise<CategoryEntity | null>;
  /** Inserts the category if no category has this name ({ name: 1 }). */
  createIfMissing(name: string): Promise<{ category: CategoryEntity; created: boolean }>;
}
