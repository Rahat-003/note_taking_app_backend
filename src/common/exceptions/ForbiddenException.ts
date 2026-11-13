import { HttpException } from './HttpException';

export class ForbiddenException extends HttpException {
  /** permission: the missing permission key, when the request was refused for lack of it. */
  constructor(message = 'Forbidden', permission?: string) {
    super(403, message, permission ? { code: 'PERMISSION_DENIED', permission } : { code: 'FORBIDDEN' });
  }

  /** "You don't have permission to <what the permission allows>. Ask an admin if you need access." */
  static missing(permission: string, description?: string): ForbiddenException {
    // The key stays in the machine-readable `permission` field; the message is for people.
    const what = description ? description.charAt(0).toLowerCase() + description.slice(1) : 'do this';
    return new ForbiddenException(`You don't have permission to ${what}. Ask an admin if you need access.`, permission);
  }
}
