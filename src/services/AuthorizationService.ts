import type { Types } from 'mongoose';
import type { RoleGrant } from '../domain/RolePermission';

/** Reads and changes which permissions a role grants (role_permissions). Callers work with permission keys. */
export interface AuthorizationService {
  /** Keys of the role's active grants: what users with this role can do. */
  getPermissions(roleId: Types.ObjectId): Promise<string[]>;
  /** Every grant of the role, active or not. */
  getGrants(roleId: Types.ObjectId): Promise<RoleGrant[]>;
  grant(roleId: Types.ObjectId, keys: readonly string[]): Promise<void>;
  /** Replaces the role's grants with exactly `keys`; grants that stay keep their isActive flag. */
  setRolePermissions(roleId: Types.ObjectId, keys: readonly string[]): Promise<void>;
  /** Returns false when the role does not grant that permission. */
  setGrantActive(roleId: Types.ObjectId, permissionId: Types.ObjectId, isActive: boolean): Promise<boolean>;
}
