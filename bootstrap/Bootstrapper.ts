import { inject, injectable } from 'tsyringe';
import { Tokens } from '../src/common/Tokens';
import type { PermissionRepository } from '../src/repositories/PermissionRepository';
import type { RoleRepository } from '../src/repositories/RoleRepository';
import type { UserRepository } from '../src/repositories/UserRepository';
import type { AuthorizationService } from '../src/services/AuthorizationService';
import permissions from './permission.json';
import roles from './role.json';
import users from './user.json';

export interface BootstrapReport {
  permissions: number;
  roles: number;
  users: number;
}

/**
 * Feeds the JSON files in bootstrap/ into their collections. Safe to run repeatedly:
 *   permission.json -> permissions        upserted by key (descriptions kept in sync)
 *   role.json       -> roles              inserted by name if missing
 *                   -> role_permissions   "*" always grants every permission; a list is granted
 *                                         only when the role is first created, so admin edits stay
 *   user.json       -> users              inserted by email if missing; passwords are bcrypt-hashed
 * String values may reference env vars as ${NAME}, so secrets stay out of the repo.
 */
@injectable()
export class Bootstrapper {
  constructor(
    @inject(Tokens.PermissionRepository) private readonly permissionRepository: PermissionRepository,
    @inject(Tokens.RoleRepository) private readonly roleRepository: RoleRepository,
    @inject(Tokens.UserRepository) private readonly userRepository: UserRepository,
    @inject(Tokens.AuthorizationService) private readonly authorization: AuthorizationService,
  ) {}

  async run(): Promise<BootstrapReport> {
    return {
      permissions: await this.seedPermissions(),
      roles: await this.seedRoles(),
      users: await this.seedUsers(),
    };
  }

  private async seedPermissions(): Promise<number> {
    await this.permissionRepository.upsertAll(permissions);
    return permissions.length;
  }

  private async seedRoles(): Promise<number> {
    const allKeys = permissions.map((p) => p.key);
    let created = 0;
    for (const entry of roles) {
      const keys = entry.permissions === '*' ? allKeys : entry.permissions;
      if (!Array.isArray(keys)) throw new Error(`role.json: permissions of "${entry.name}" must be "*" or a list`);
      const result = await this.roleRepository.createIfMissing({
        name: entry.name,
        description: entry.description,
        system: entry.system,
      });
      if (entry.permissions === '*' || result.created) await this.authorization.grant(result.role._id, keys);
      if (result.created) created += 1;
    }
    return created;
  }

  private async seedUsers(): Promise<number> {
    let created = 0;
    for (const entry of users) {
      const email = Bootstrapper.interpolate(entry.email);
      if (await this.userRepository.existsByEmail(email)) continue;
      const role = await this.roleRepository.findByName(entry.role);
      if (!role) throw new Error(`user.json: role "${entry.role}" for ${email} does not exist`);
      await this.userRepository.create({
        name: Bootstrapper.interpolate(entry.name),
        email,
        password: Bootstrapper.interpolate(entry.password), // hashed by the pre-save hook
        role_id: role._id,
      });
      created += 1;
    }
    return created;
  }

  private static interpolate(value: string): string {
    return value.replace(/\$\{(\w+)\}/g, (_match, name: string) => {
      const resolved = process.env[name];
      if (!resolved) throw new Error(`user.json: environment variable ${name} is not set`);
      return resolved;
    });
  }
}
