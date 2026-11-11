import { Schema, Types, model } from 'mongoose';

// Join collection: which permissions a role grants. `permission` holds the permission's
// immutable unique key, so a role's permissions are read straight from this index.
export interface RolePermissionEntity {
  _id: Types.ObjectId;
  role: Types.ObjectId;
  permission: string;
}

const rolePermissionSchema = new Schema<RolePermissionEntity>(
  {
    role: { type: Schema.Types.ObjectId, ref: 'Role', required: true },
    permission: { type: String, required: true },
  },
  { versionKey: false, collection: 'role_permissions' },
);

// Per-request permission load: find({ role }, { _id: 0, permission: 1 }) is a covered query.
// Also: no duplicate grants, the $lookup in the role list, and deleteMany({ role }) on role delete.
rolePermissionSchema.index({ role: 1, permission: 1 }, { unique: true });

export const RolePermissionModel = model<RolePermissionEntity>('RolePermission', rolePermissionSchema);
