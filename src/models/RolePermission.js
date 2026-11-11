const mongoose = require('mongoose');

// Join collection: which permissions a role grants. `permission` holds the permission's
// immutable unique key, so a role's permissions are read straight from this index.
const rolePermissionSchema = new mongoose.Schema(
  {
    role: { type: mongoose.Schema.Types.ObjectId, ref: 'Role', required: true },
    permission: { type: String, required: true },
  },
  { versionKey: false, collection: 'role_permissions' },
);

// Per-request permission load: find({ role }, { _id: 0, permission: 1 }) is a covered query.
// Also: no duplicate grants, the $lookup in the role list, and deleteMany({ role }) on role delete.
rolePermissionSchema.index({ role: 1, permission: 1 }, { unique: true });

module.exports = { RolePermission: mongoose.model('RolePermission', rolePermissionSchema) };
