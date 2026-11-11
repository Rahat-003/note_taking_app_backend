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
    const role = await this.load(roleId);
    return { ...role, permissions: await this.authorization.getPermissions(role._id) };
  }

  async create(principal: Principal, dto: CreateRoleDto): Promise<RoleView> {
    principal.assertHolds(dto.permissions, 'You cannot grant permissions you do not have');
    const role = await this.roles.create({ name: dto.name, description: dto.description });
    await this.authorization.setRolePermissions(role._id, dto.permissions);
    return { ...role, permissions: dto.permissions };
  }

  async update(principal: Principal, roleId: string, dto: UpdateRoleDto): Promise<RoleView> {
    const role = await this.load(roleId);
    if (role.name === RoleName.ADMIN) throw new BadRequestException('The admin role always has every permission');
    if (role.system && dto.name && dto.name !== role.name) throw new BadRequestException('System roles cannot be renamed');

    const { permissions, ...fields } = dto;
    const current = await this.authorization.getPermissions(role._id);
    principal.assertHolds(current, 'You cannot edit a role with permissions you do not have');
    if (permissions) {
      principal.assertHolds(permissions, 'You cannot grant permissions you do not have');
      await this.authorization.setRolePermissions(role._id, permissions);
    }
    const updated = Object.keys(fields).length ? await this.roles.update(role._id, fields) : role;
    return { ...(updated ?? role), permissions: permissions ?? current };
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

  private async load(roleId: string): Promise<RoleEntity> {
    const role = await this.roles.findById(ObjectIds.parse(roleId));
    if (!role) throw new NotFoundException('Role not found');
    return role;
  }
}
