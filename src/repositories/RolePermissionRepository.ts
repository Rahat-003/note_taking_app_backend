import type { Types } from 'mongoose';

export interface RolePermissionRepository {
  /** Covered query on { role: 1, permission: 1 }: answered from the index alone. */
  findKeysByRole(roleId: Types.ObjectId): Promise<string[]>;
  /** Idempotent upserts on { role: 1, permission: 1 }. */
  grant(roleId: Types.ObjectId, keys: readonly string[]): Promise<void>;
  /** Removes every grant of the role except `keys`. */
  revokeAllExcept(roleId: Types.ObjectId, keys: readonly string[]): Promise<void>;
  deleteByRole(roleId: Types.ObjectId): Promise<void>;
}
