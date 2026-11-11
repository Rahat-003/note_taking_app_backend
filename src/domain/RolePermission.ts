import { Schema, Types, model } from 'mongoose';

// Join collection: which permissions a role grants (role_id -> roles._id, permission_id -> permissions._id).
// Only grants with isActive: true count; an inactive grant stays on the role but gives no access.
export interface RolePermissionEntity {
  _id: Types.ObjectId;
  role_id: Types.ObjectId;
  permission_id: Types.ObjectId;
  isActive: boolean;
}

/** A role's grant as returned by the API: the permission's id and key, and whether it is active. */
export interface RoleGrant {
  permission_id: Types.ObjectId;
  key: string;
  isActive: boolean;
}

const rolePermissionSchema = new Schema<RolePermissionEntity>(
  {
    role_id: { type: Schema.Types.ObjectId, ref: 'Role', required: true },
    permission_id: { type: Schema.Types.ObjectId, ref: 'Permission', required: true },
    isActive: { type: Boolean, required: true, default: true },
  },
  { versionKey: false, collection: 'role_permissions' },
);

// Per-request permission load (match on role_id, then $lookup into permissions by _id), no duplicate
// grants, the toggle endpoint's { role_id, permission_id } update, the $lookup in the role list, and
// deleteMany({ role_id }) on role delete.
rolePermissionSchema.index({ role_id: 1, permission_id: 1 }, { unique: true });

export const RolePermissionModel = model<RolePermissionEntity>('RolePermission', rolePermissionSchema);
