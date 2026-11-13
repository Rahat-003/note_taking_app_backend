import catalog from '../../bootstrap/permission.json';

// Permission keys checked in code. The catalog stored in the permissions collection is
// bootstrap/permission.json; startup fails if a key used here is missing from it.
export enum PermissionKey {
  NOTES_MANAGE_OWN = 'notes.manage_own',
  NOTES_UPDATE_OWN = 'notes.update_own',
  NOTES_DELETE_OWN = 'notes.delete_own',
  NOTES_READ_ALL = 'notes.read_all',
  POSTS_CREATE = 'posts.create',
  USERS_READ = 'users.read',
  USERS_MANAGE = 'users.manage',
  ROLES_MANAGE = 'roles.manage',
}

export const PERMISSION_KEYS: readonly string[] = catalog.map((p) => p.key);

/** What each permission allows, from the catalog (used in "you don't have permission to ..." errors). */
export const PERMISSION_DESCRIPTIONS: ReadonlyMap<string, string> = new Map(catalog.map((p) => [p.key, p.description]));

const missing = Object.values(PermissionKey).filter((key) => !PERMISSION_KEYS.includes(key));
if (missing.length) throw new Error(`bootstrap/permission.json is missing: ${missing.join(', ')}`);
