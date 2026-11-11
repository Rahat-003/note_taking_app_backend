const express = require('express');
const { z } = require('zod');
const { User } = require('../models/User');
const { Role } = require('../models/Role');
const { Note } = require('../models/Note');
const { Post } = require('../models/Post');
const { authenticate, authorize, assertHolds } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { DEFAULT_ROLE, getRolePermissions } = require('../rbac');
const { HttpError, toObjectId } = require('../utils/errors');
const { parsePagination, paginated } = require('../utils/pagination');
const { usersByInterestPipeline, userPostsPipeline } = require('../aggregations');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();
router.use(authenticate);

const createSchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.email().max(254),
  password: z.string().min(8).max(72),
  role: z.string().optional(),
  interests: z.array(z.string().trim().toLowerCase().min(1).max(50)).max(20).optional(),
});
const updateSchema = createSchema.partial().strict();

// The role must exist and grant nothing the acting user doesn't hold (no privilege escalation).
async function resolveAssignableRole(req, roleId) {
  const role = roleId ? await Role.findById(toObjectId(roleId)) : await Role.findOne({ name: DEFAULT_ROLE });
  if (!role) throw new HttpError(400, 'Role does not exist');
  assertHolds(req, await getRolePermissions(role._id), 'You cannot assign a role with permissions you do not have');
  return role;
}

// Loads a user that the acting user is allowed to manage (their role must not out-rank the actor).
async function loadManageableUser(req) {
  const id = toObjectId(req.params.id);
  if (id.equals(req.user._id)) throw new HttpError(400, 'Use your profile to change your own account');
  const user = await User.findById(id);
  if (!user) throw new HttpError(404, 'User not found');
  assertHolds(req, await getRolePermissions(user.role), 'You cannot manage a user with more permissions than you');
  return user;
}

// Scenario 1: users grouped by interest (single aggregate call, { interests: 1 } index).
router.get(
  '/interests',
  authorize('users.read'),
  asyncHandler(async (req, res) => {
    const pg = parsePagination(req.query);
    const interest = typeof req.query.interest === 'string' ? req.query.interest.trim().toLowerCase() : '';
    const [result] = await User.aggregate(usersByInterestPipeline({ interest, ...pg }));
    res.json(paginated(result.data, result.total[0]?.count ?? 0, pg));
  }),
);

// Scenario 2: a user's posts via $lookup. Posts are public, so any authenticated user may call it.
router.get(
  '/:id/posts',
  asyncHandler(async (req, res) => {
    const pg = parsePagination(req.query);
    const [user] = await User.aggregate(userPostsPipeline({ userId: toObjectId(req.params.id), ...pg }));
    if (!user) throw new HttpError(404, 'User not found');
    const { posts, total, ...author } = user;
    res.json({ user: author, ...paginated(posts, total, pg) });
  }),
);

router.get(
  '/',
  authorize('users.read', 'users.manage'),
  asyncHandler(async (req, res) => {
    const pg = parsePagination(req.query);
    const [data, total] = await Promise.all([
      User.find().sort({ _id: -1 }).skip(pg.skip).limit(pg.limit).select('-__v').populate('role', 'name').lean(),
      User.estimatedDocumentCount(),
    ]);
    res.json(paginated(data, total, pg));
  }),
);

router.post(
  '/',
  authorize('users.manage'),
  validate(createSchema),
  asyncHandler(async (req, res) => {
    const role = await resolveAssignableRole(req, req.body.role);
    const user = await User.create({ ...req.body, role: role._id });
    res.status(201).json(await user.populate('role', 'name'));
  }),
);

router.get(
  '/:id',
  authorize('users.read', 'users.manage'),
  asyncHandler(async (req, res) => {
    const user = await User.findById(toObjectId(req.params.id)).populate('role', 'name');
    if (!user) throw new HttpError(404, 'User not found');
    res.json(user);
  }),
);

router.patch(
  '/:id',
  authorize('users.manage'),
  validate(updateSchema),
  asyncHandler(async (req, res) => {
    const user = await loadManageableUser(req);
    const { role, ...fields } = req.body;
    if (role) user.role = (await resolveAssignableRole(req, role))._id;
    user.set(fields);
    await user.save(); // save() so a changed password goes through the hashing hook
    res.json(await user.populate('role', 'name'));
  }),
);

router.delete(
  '/:id',
  authorize('users.manage'),
  asyncHandler(async (req, res) => {
    const user = await loadManageableUser(req);
    await User.deleteOne({ _id: user._id });
    // Cascade: { owner: 1, _id: -1 } and { author: 1, _id: -1 } serve these filters.
    await Promise.all([Note.deleteMany({ owner: user._id }), Post.deleteMany({ author: user._id })]);
    res.status(204).end();
  }),
);

module.exports = router;
