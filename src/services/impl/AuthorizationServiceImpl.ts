import type { Types } from 'mongoose';
import { inject, injectable } from 'tsyringe';
import { Tokens } from '../../common/Tokens';
import type { RolePermissionRepository } from '../../repositories/RolePermissionRepository';
import type { AuthorizationService } from '../AuthorizationService';

@injectable()
export class AuthorizationServiceImpl implements AuthorizationService {
  constructor(
    @inject(Tokens.RolePermissionRepository) private readonly rolePermissions: RolePermissionRepository,
  ) {}

  getPermissions(roleId: Types.ObjectId): Promise<string[]> {
    return this.rolePermissions.findKeysByRole(roleId);
  }

  grant(roleId: Types.ObjectId, keys: readonly string[]): Promise<void> {
    return this.rolePermissions.grant(roleId, keys);
  }

  async setRolePermissions(roleId: Types.ObjectId, keys: readonly string[]): Promise<void> {
    await this.rolePermissions.revokeAllExcept(roleId, keys);
    await this.rolePermissions.grant(roleId, keys);
  }
}
