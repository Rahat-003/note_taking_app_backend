import type { Page } from '../common/pagination/Page';
import type { PageRequest } from '../common/pagination/PageRequest';
import type { TagEntity } from '../domain/Tag';

export interface TagRepository {
  /** Sorted by the { name: 1 } unique index; total from collection metadata. */
  findAll(page: PageRequest): Promise<Page<TagEntity>>;
  /** Upserts each name ({ name: 1 }) and returns the tags, in the order of `names`. */
  findOrCreateByNames(names: readonly string[]): Promise<TagEntity[]>;
}
