import type { Types } from 'mongoose';

export interface AuthorizationService {
  getPermissions(roleId: Types.ObjectId): Promise<string[]>;
  grant(roleId: Types.ObjectId, keys: readonly string[]): Promise<void>;
  /** Replaces a role's permission set with exactly `keys`. */
  setRolePermissions(roleId: Types.ObjectId, keys: readonly string[]): Promise<void>;
}
