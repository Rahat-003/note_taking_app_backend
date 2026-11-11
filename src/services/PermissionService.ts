import type { Page } from '../common/pagination/Page';
import type { PageRequest } from '../common/pagination/PageRequest';
import type { PermissionEntity } from '../domain/Permission';

export interface PermissionService {
  list(page: PageRequest): Promise<Page<PermissionEntity>>;
}
