const { RolePermission } = require('./models/RolePermission');

// The permission catalog lives in bootstrap/permission.json and is loaded with `npm run bootstrap`.
const PERMISSIONS = require('../bootstrap/permission.json');
const PERMISSION_KEYS = PERMISSIONS.map((p) => p.key);

const ADMIN_ROLE = 'admin';
const DEFAULT_ROLE = 'user';

async function getRolePermissions(roleId) {
  const rows = await RolePermission.find({ role: roleId }, { _id: 0, permission: 1 }).lean();
  return rows.map((r) => r.permission);
}

async function grant(roleId, keys) {
  if (!keys.length) return;
  await RolePermission.bulkWrite(
    keys.map((permission) => ({
      updateOne: { filter: { role: roleId, permission }, update: { $setOnInsert: { role: roleId, permission } }, upsert: true },
    })),
  );
}

// Replaces a role's permission set with exactly `keys`.
async function setRolePermissions(roleId, keys) {
  await RolePermission.deleteMany({ role: roleId, permission: { $nin: keys } });
  await grant(roleId, keys);
}

module.exports = {
  PERMISSIONS,
  PERMISSION_KEYS,
  ADMIN_ROLE,
  DEFAULT_ROLE,
  getRolePermissions,
  grant,
  setRolePermissions,
};
