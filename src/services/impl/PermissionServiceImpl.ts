import { inject, injectable } from 'tsyringe';
import type { Page } from '../../common/pagination/Page';
import type { PageRequest } from '../../common/pagination/PageRequest';
import { Tokens } from '../../common/Tokens';
import type { PermissionEntity } from '../../domain/Permission';
import type { PermissionRepository } from '../../repositories/PermissionRepository';
import type { PermissionService } from '../PermissionService';

@injectable()
export class PermissionServiceImpl implements PermissionService {
  constructor(@inject(Tokens.PermissionRepository) private readonly permissions: PermissionRepository) {}

  list(page: PageRequest): Promise<Page<PermissionEntity>> {
    return this.permissions.findAll(page);
  }
}
