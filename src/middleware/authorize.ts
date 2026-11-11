import type { RequestHandler } from 'express';
import { ForbiddenException } from '../common/exceptions/ForbiddenException';
import type { PermissionKey } from '../common/PermissionKey';

/** Passes when the authenticated user holds at least one of the given permissions. */
export function authorize(...permissions: PermissionKey[]): RequestHandler {
  return (req, _res, next) => {
    if (!req.principal?.canAny(...permissions)) return next(new ForbiddenException());
    next();
  };
}
