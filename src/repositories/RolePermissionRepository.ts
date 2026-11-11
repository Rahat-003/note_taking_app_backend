import type { Types } from 'mongoose';
import type { RoleGrant } from '../domain/RolePermission';

export interface RolePermissionRepository {
  /**
   * Keys of the role's active grants: $match on role_id_1_permission_id_1, then $lookup into permissions
   * by _id. Runs on every authenticated request.
   */
  findActiveKeysByRole(roleId: Types.ObjectId): Promise<string[]>;
  /** Every grant of the role (active or not) with its permission key, sorted by key. */
  findGrantsByRole(roleId: Types.ObjectId): Promise<RoleGrant[]>;
  /** Idempotent upserts on role_id_1_permission_id_1; new grants start active, existing ones keep isActive. */
  grant(roleId: Types.ObjectId, permissionIds: readonly Types.ObjectId[]): Promise<void>;
  /** Removes every grant of the role except `permissionIds`. */
  revokeAllExcept(roleId: Types.ObjectId, permissionIds: readonly Types.ObjectId[]): Promise<void>;
  /** Sets isActive on one grant (role_id_1_permission_id_1). Returns false when the role has no such grant. */
  setActive(roleId: Types.ObjectId, permissionId: Types.ObjectId, isActive: boolean): Promise<boolean>;
  deleteByRole(roleId: Types.ObjectId): Promise<void>;
}
