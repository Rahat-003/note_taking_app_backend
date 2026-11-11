import type { Types } from 'mongoose';
import { inject, injectable } from 'tsyringe';
import { Tokens } from '../../common/Tokens';
import type { RoleGrant } from '../../domain/RolePermission';
import type { PermissionRepository } from '../../repositories/PermissionRepository';
import type { RolePermissionRepository } from '../../repositories/RolePermissionRepository';
import type { AuthorizationService } from '../AuthorizationService';

@injectable()
export class AuthorizationServiceImpl implements AuthorizationService {
  constructor(
    @inject(Tokens.RolePermissionRepository) private readonly rolePermissions: RolePermissionRepository,
    @inject(Tokens.PermissionRepository) private readonly permissions: PermissionRepository,
  ) {}

  getPermissions(roleId: Types.ObjectId): Promise<string[]> {
    return this.rolePermissions.findActiveKeysByRole(roleId);
  }

  getGrants(roleId: Types.ObjectId): Promise<RoleGrant[]> {
    return this.rolePermissions.findGrantsByRole(roleId);
  }

  async grant(roleId: Types.ObjectId, keys: readonly string[]): Promise<void> {
    await this.rolePermissions.grant(roleId, await this.idsOf(keys));
  }

  async setRolePermissions(roleId: Types.ObjectId, keys: readonly string[]): Promise<void> {
    const ids = await this.idsOf(keys);
    await this.rolePermissions.revokeAllExcept(roleId, ids);
    await this.rolePermissions.grant(roleId, ids);
  }

  setGrantActive(roleId: Types.ObjectId, permissionId: Types.ObjectId, isActive: boolean): Promise<boolean> {
    return this.rolePermissions.setActive(roleId, permissionId, isActive);
  }

  /** Resolves permission keys to permissions._id (the foreign key stored in role_permissions). */
  private async idsOf(keys: readonly string[]): Promise<Types.ObjectId[]> {
    if (!keys.length) return [];
    const found = await this.permissions.findByKeys(keys);
    const missing = keys.filter((key) => !found.some((p) => p.key === key));
    if (missing.length) throw new Error(`Permissions missing from the database: ${missing.join(', ')}; run npm run bootstrap`);
    return found.map((p) => p._id);
  }
}
