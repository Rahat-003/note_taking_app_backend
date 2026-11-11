import type { Page } from '../common/pagination/Page';
import type { PageRequest } from '../common/pagination/PageRequest';
import type { PermissionEntity } from '../domain/Permission';

export interface PermissionRepository {
  /** Sorted by the { key: 1 } unique index. */
  findAll(page: PageRequest): Promise<Page<PermissionEntity>>;
  /** Upserts by key ({ key: 1 }), keeping descriptions in sync. */
  upsertAll(permissions: ReadonlyArray<{ key: string; description: string }>): Promise<void>;
}
