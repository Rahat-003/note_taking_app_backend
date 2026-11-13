import { HttpException } from './HttpException';

export class ForbiddenException extends HttpException {
  /** permission: the missing permission key, when the request was refused for lack of it. */
  constructor(message = 'Forbidden', permission?: string) {
    super(403, message, permission ? { code: 'PERMISSION_DENIED', permission } : { code: 'FORBIDDEN' });
  }

  /** "You don't have permission to <what the permission allows>", from the permission catalog. */
  static missing(permission: string, description?: string): ForbiddenException {
    const what = description ? description.charAt(0).toLowerCase() + description.slice(1) : `use ${permission}`;
    return new ForbiddenException(`You don't have permission to ${what}. Ask an admin to give your role the "${permission}" permission.`, permission);
  }
}
