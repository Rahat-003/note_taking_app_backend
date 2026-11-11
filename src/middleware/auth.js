const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const config = require('../config');
const { User } = require('../models/User');
const { getRolePermissions } = require('../rbac');
const { HttpError } = require('../utils/errors');

function signToken(user) {
  return jwt.sign({ sub: String(user._id) }, config.jwtSecret, {
    algorithm: 'HS256',
    expiresIn: config.jwtExpiresIn,
  });
}

// Verifies the JWT and loads the user plus their role's permissions on every request,
// so deleted users and permission changes take effect immediately.
async function authenticate(req, _res, next) {
  try {
    const [scheme, token] = (req.headers.authorization || '').split(' ');
    if (scheme !== 'Bearer' || !token) throw new HttpError(401, 'Authentication required');

    let payload;
    try {
      payload = jwt.verify(token, config.jwtSecret, { algorithms: ['HS256'] });
    } catch {
      throw new HttpError(401, 'Invalid or expired token');
    }
    if (!mongoose.isValidObjectId(payload.sub)) throw new HttpError(401, 'Invalid token');

    const user = await User.findById(payload.sub).populate('role', 'name'); // _id indexes
    if (!user) throw new HttpError(401, 'User no longer exists');

    req.user = user;
    req.permissions = new Set(user.role ? await getRolePermissions(user.role._id) : []);
    next();
  } catch (err) {
    next(err);
  }
}

const can = (req, permission) => req.permissions.has(permission);

// Passes when the user holds at least one of the given permissions.
function authorize(...permissions) {
  return (req, _res, next) => {
    if (!permissions.some((p) => can(req, p))) return next(new HttpError(403, 'Forbidden'));
    next();
  };
}

// Prevents privilege escalation: you may only hand out or act on permissions you hold yourself.
function assertHolds(req, permissions, message) {
  if (permissions.some((p) => !can(req, p))) throw new HttpError(403, message);
}

module.exports = { signToken, authenticate, authorize, can, assertHolds };
