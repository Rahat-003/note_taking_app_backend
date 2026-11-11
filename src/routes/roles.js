const express = require('express');
const { z } = require('zod');
const { Role } = require('../models/Role');
const { Permission } = require('../models/Permission');
const { RolePermission } = require('../models/RolePermission');
const { User } = require('../models/User');
const { authenticate, authorize, assertHolds } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { ADMIN_ROLE, PERMISSION_KEYS, getRolePermissions, setRolePermissions } = require('../rbac');
const { HttpError, toObjectId } = require('../utils/errors');
const { parsePagination, paginated } = require('../utils/pagination');
const asyncHandler = require('../utils/asyncHandler');

const permissionsRouter = express.Router();
const rolesRouter = express.Router();
permissionsRouter.use(authenticate);
rolesRouter.use(authenticate);

const permissionList = z.array(z.enum(PERMISSION_KEYS)).max(PERMISSION_KEYS.length).transform((l) => [...new Set(l)]);
const createSchema = z.object({
  name: z.string().trim().toLowerCase().min(1).max(50).regex(/^[a-z0-9_-]+$/, 'use letters, numbers, - or _'),
  description: z.string().trim().max(200).optional(),
  permissions: permissionList.default([]),
});
const updateSchema = createSchema.partial().strict();

// GET /api/permissions: the permission catalog, sorted by key ({ key: 1 } index).
permissionsRouter.get(
  '/',
  authorize('roles.manage'),
  asyncHandler(async (req, res) => {
    const pg = parsePagination(req.query);
    const [data, total] = await Promise.all([
      Permission.find().sort({ key: 1 }).skip(pg.skip).limit(pg.limit).lean(),
      Permission.estimatedDocumentCount(),
    ]);
    res.json(paginated(data, total, pg));
  }),
);

// Roles sorted by name ({ name: 1 } index), each with its permission keys via $lookup
// into role_permissions ({ role: 1, permission: 1 } index).
rolesRouter.get(
  '/',
  authorize('roles.manage', 'users.manage'),
  asyncHandler(async (req, res) => {
    const pg = parsePagination(req.query);
    const [data, total] = await Promise.all([
      Role.aggregate([
        { $sort: { name: 1 } },
        { $skip: pg.skip },
        { $limit: pg.limit },
        {
          $lookup: {
            from: 'role_permissions',
            localField: '_id',
            foreignField: 'role',
            as: 'permissions',
            pipeline: [{ $project: { _id: 0, permission: 1 } }],
          },
        },
        { $set: { permissions: '$permissions.permission' } },
      ]),
      Role.estimatedDocumentCount(),
    ]);
    res.json(paginated(data, total, pg));
  }),
);

async function loadRole(id) {
  const role = await Role.findById(toObjectId(id)).lean();
  if (!role) throw new HttpError(404, 'Role not found');
  return role;
}

rolesRouter.get(
  '/:id',
  authorize('roles.manage'),
  asyncHandler(async (req, res) => {
    const role = await loadRole(req.params.id);
    res.json({ ...role, permissions: await getRolePermissions(role._id) });
  }),
);

rolesRouter.post(
  '/',
  authorize('roles.manage'),
  validate(createSchema),
  asyncHandler(async (req, res) => {
    const { permissions, ...fields } = req.body;
    assertHolds(req, permissions, 'You cannot grant permissions you do not have');
    const role = await Role.create(fields);
    await setRolePermissions(role._id, permissions);
    res.status(201).json({ ...role.toObject(), permissions });
  }),
);

rolesRouter.patch(
  '/:id',
  authorize('roles.manage'),
  validate(updateSchema),
  asyncHandler(async (req, res) => {
    const role = await loadRole(req.params.id);
    if (role.name === ADMIN_ROLE) throw new HttpError(400, 'The admin role always has every permission');
    if (role.system && req.body.name && req.body.name !== role.name) {
      throw new HttpError(400, 'System roles cannot be renamed');
    }

    const { permissions, ...fields } = req.body;
    const current = await getRolePermissions(role._id);
    assertHolds(req, current, 'You cannot edit a role with permissions you do not have');
    if (permissions) {
      assertHolds(req, permissions, 'You cannot grant permissions you do not have');
      await setRolePermissions(role._id, permissions);
    }
    const updated = Object.keys(fields).length
      ? await Role.findByIdAndUpdate(role._id, { $set: fields }, { new: true, runValidators: true }).lean()
      : role;
    res.json({ ...updated, permissions: permissions ?? current });
  }),
);

rolesRouter.delete(
  '/:id',
  authorize('roles.manage'),
  asyncHandler(async (req, res) => {
    const role = await loadRole(req.params.id);
    if (role.system) throw new HttpError(400, 'System roles cannot be deleted');
    if (await User.exists({ role: role._id })) { // { role: 1 } index
      throw new HttpError(409, 'Role is still assigned to users; reassign them first');
    }
    await RolePermission.deleteMany({ role: role._id });
    await Role.deleteOne({ _id: role._id });
    res.status(204).end();
  }),
);

module.exports = { permissionsRouter, rolesRouter };
