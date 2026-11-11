import type { Types } from 'mongoose';
import { ForbiddenException } from '../common/exceptions/ForbiddenException';
import type { PermissionKey } from '../common/PermissionKey';
import type { UserWithRole } from '../domain/User';

/** The authenticated caller: their user document and their role's permissions, loaded per request. */
export class Principal {
  constructor(
    readonly user: UserWithRole,
    readonly permissions: ReadonlySet<string>,
  ) {}

  get id(): Types.ObjectId {
    return this.user._id;
  }

  can(permission: PermissionKey): boolean {
    return this.permissions.has(permission);
  }

  canAny(...permissions: PermissionKey[]): boolean {
    return permissions.some((p) => this.can(p));
  }

  /** Prevents privilege escalation: you may only hand out or act on permissions you hold yourself. */
  assertHolds(permissions: readonly string[], message: string): void {
    if (permissions.some((p) => !this.permissions.has(p))) throw new ForbiddenException(message);
  }
}
