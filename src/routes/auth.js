const express = require('express');
const { z } = require('zod');
const rateLimit = require('express-rate-limit').default;
const { User } = require('../models/User');
const { Role } = require('../models/Role');
const { signToken, authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { DEFAULT_ROLE, getRolePermissions } = require('../rbac');
const { HttpError } = require('../utils/errors');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
  message: { error: 'Too many attempts, try again later' },
});

const registerSchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.email().max(254),
  password: z.string().min(8).max(72),
});

const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(1).max(72),
});

const updateMeSchema = z
  .object({
    name: z.string().trim().min(1).max(100).optional(),
    interests: z.array(z.string().trim().toLowerCase().min(1).max(50)).max(20).optional(),
    password: z.string().min(8).max(72).optional(),
  })
  .strict();

async function session(user) {
  await user.populate('role', 'name');
  return { user, permissions: user.role ? await getRolePermissions(user.role._id) : [] };
}

router.post(
  '/register',
  authLimiter,
  validate(registerSchema),
  asyncHandler(async (req, res) => {
    // Self-registered accounts always get the default role; the request cannot choose one.
    const role = await Role.findOne({ name: DEFAULT_ROLE }); // { name: 1 } index
    const user = await User.create({ ...req.body, role: role._id });
    res.status(201).json({ token: signToken(user), ...(await session(user)) });
  }),
);

router.post(
  '/login',
  authLimiter,
  validate(loginSchema),
  asyncHandler(async (req, res) => {
    // { email: 1 } unique index.
    const user = await User.findOne({ email: req.body.email.toLowerCase() }).select('+password');
    if (!user || !(await user.comparePassword(req.body.password))) {
      throw new HttpError(401, 'Invalid email or password');
    }
    res.json({ token: signToken(user), ...(await session(user)) });
  }),
);

router.get('/me', authenticate, (req, res) => res.json({ user: req.user, permissions: [...req.permissions] }));

router.patch(
  '/me',
  authenticate,
  validate(updateMeSchema),
  asyncHandler(async (req, res) => {
    req.user.set(req.body);
    await req.user.save();
    res.json({ user: req.user, permissions: [...req.permissions] });
  }),
);

module.exports = router;
