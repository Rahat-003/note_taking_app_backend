import { inject, injectable } from 'tsyringe';
import { BadRequestException } from '../../common/exceptions/BadRequestException';
import { ConflictException } from '../../common/exceptions/ConflictException';
import { NotFoundException } from '../../common/exceptions/NotFoundException';
import { ObjectIds } from '../../common/ObjectIds';
import type { Page } from '../../common/pagination/Page';
import type { PageRequest } from '../../common/pagination/PageRequest';
import { RoleName } from '../../common/RoleName';
import { Tokens } from '../../common/Tokens';
import type { RoleEntity, RoleView } from '../../domain/Role';
import type { CreateRoleDto } from '../../dto/role/CreateRoleDto';
import type { SetGrantActiveDto } from '../../dto/role/SetGrantActiveDto';
import type { UpdateRoleDto } from '../../dto/role/UpdateRoleDto';
import type { RolePermissionRepository } from '../../repositories/RolePermissionRepository';
import type { RoleRepository } from '../../repositories/RoleRepository';
import type { UserRepository } from '../../repositories/UserRepository';
import type { AuthorizationService } from '../AuthorizationService';
import type { Principal } from '../Principal';
import type { RoleService } from '../RoleService';

@injectable()
export class RoleServiceImpl implements RoleService {
  constructor(
    @inject(Tokens.RoleRepository) private readonly roles: RoleRepository,
    @inject(Tokens.RolePermissionRepository) private readonly rolePermissions: RolePermissionRepository,
    @inject(Tokens.UserRepository) private readonly users: UserRepository,
    @inject(Tokens.AuthorizationService) private readonly authorization: AuthorizationService,
  ) {}

  list(page: PageRequest): Promise<Page<RoleView>> {
    return this.roles.findAllWithPermissions(page);
  }

  async get(roleId: string): Promise<RoleView> {
    return this.withGrants(await this.load(roleId));
  }

  async create(principal: Principal, dto: CreateRoleDto): Promise<RoleView> {
    principal.assertHolds(dto.permissions, 'You cannot grant permissions you do not have');
    const role = await this.roles.create({ name: dto.name, description: dto.description });
    await this.authorization.setRolePermissions(role._id, dto.permissions);
    return this.withGrants(role);
  }

  async update(principal: Principal, roleId: string, dto: UpdateRoleDto): Promise<RoleView> {
    const role = await this.load(roleId);
    if (role.name === RoleName.ADMIN) throw new BadRequestException('The admin role always has every permission');
    if (role.system && dto.name && dto.name !== role.name) throw new BadRequestException('System roles cannot be renamed');

    const { permissions, ...fields } = dto;
    principal.assertHolds(await this.grantedKeys(role), 'You cannot edit a role with permissions you do not have');
    if (permissions) {
      principal.assertHolds(permissions, 'You cannot grant permissions you do not have');
      await this.authorization.setRolePermissions(role._id, permissions);
    }
    const updated = Object.keys(fields).length ? await this.roles.update(role._id, fields) : role;
    return this.withGrants(updated ?? role);
  }

  async setGrantActive(principal: Principal, roleId: string, permissionId: string, dto: SetGrantActiveDto): Promise<RoleView> {
    const role = await this.load(roleId);
    if (role.name === RoleName.ADMIN) throw new BadRequestException('The admin role always has every permission');
    // Same rule as editing the role: you must hold everything it grants (including the toggled permission).
    principal.assertHolds(await this.grantedKeys(role), 'You cannot edit a role with permissions you do not have');
    if (!(await this.authorization.setGrantActive(role._id, ObjectIds.parse(permissionId), dto.isActive))) {
      throw new NotFoundException('This role does not grant that permission');
    }
    return this.withGrants(role);
  }

  async delete(roleId: string): Promise<void> {
    const role = await this.load(roleId);
    if (role.system) throw new BadRequestException('System roles cannot be deleted');
    if (await this.users.existsByRole(role._id)) {
      throw new ConflictException('Role is still assigned to users; reassign them first');
    }
    await this.rolePermissions.deleteByRole(role._id);
    await this.roles.deleteById(role._id);
  }

  /** Keys of every grant of the role, active or not. */
  private async grantedKeys(role: RoleEntity): Promise<string[]> {
    return (await this.authorization.getGrants(role._id)).map((g) => g.key);
  }

  private async withGrants(role: RoleEntity): Promise<RoleView> {
    const grants = await this.authorization.getGrants(role._id);
    return { ...role, permissions: grants.filter((g) => g.isActive).map((g) => g.key), grants };
  }

  private async load(roleId: string): Promise<RoleEntity> {
    const role = await this.roles.findById(ObjectIds.parse(roleId));
    if (!role) throw new NotFoundException('Role not found');
    return role;
  }
}
