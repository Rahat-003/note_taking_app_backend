import type { RequestHandler } from 'express';
import { ForbiddenException } from '../common/exceptions/ForbiddenException';
import { PERMISSION_DESCRIPTIONS, type PermissionKey } from '../common/PermissionKey';

/**
 * Passes when the authenticated user holds at least one of the given permissions. Otherwise 403
 * PERMISSION_DENIED naming the first one, e.g. "You don't have permission to delete own notes."
 */
export function authorize(...permissions: PermissionKey[]): RequestHandler {
  const [first] = permissions;
  return (req, _res, next) => {
    if (req.principal?.canAny(...permissions)) return next();
    next(first ? ForbiddenException.missing(first, PERMISSION_DESCRIPTIONS.get(first)) : new ForbiddenException());
  };
}
