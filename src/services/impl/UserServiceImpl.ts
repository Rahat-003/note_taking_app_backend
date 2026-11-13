import { inject, injectable } from 'tsyringe';
import { BadRequestException } from '../../common/exceptions/BadRequestException';
import { NotFoundException } from '../../common/exceptions/NotFoundException';
import { ObjectIds } from '../../common/ObjectIds';
import type { Page } from '../../common/pagination/Page';
import type { PageRequest } from '../../common/pagination/PageRequest';
import { RoleName } from '../../common/RoleName';
import { Tokens } from '../../common/Tokens';
import type { RoleEntity } from '../../domain/Role';
import type { UserDocument, UserView, UserWithRole } from '../../domain/User';
import type { CreateUserDto } from '../../dto/user/CreateUserDto';
import type { UpdateUserDto } from '../../dto/user/UpdateUserDto';
import type { UserStatusDto } from '../../dto/user/UserStatusDto';
import type { RoleRepository } from '../../repositories/RoleRepository';
import type { InterestGroup, UserPosts, UserRepository } from '../../repositories/UserRepository';
import type { AuthorizationService } from '../AuthorizationService';
import type { Principal } from '../Principal';
import type { UserService } from '../UserService';

@injectable()
export class UserServiceImpl implements UserService {
  constructor(
    @inject(Tokens.UserRepository) private readonly users: UserRepository,
    @inject(Tokens.RoleRepository) private readonly roles: RoleRepository,
    @inject(Tokens.AuthorizationService) private readonly authorization: AuthorizationService,
  ) {}

  groupByInterest(interest: string, page: PageRequest): Promise<Page<InterestGroup>> {
    return this.users.groupByInterest(interest.trim().toLowerCase(), page);
  }

  async getPosts(userId: string, page: PageRequest): Promise<UserPosts> {
    const result = await this.users.findWithPosts(ObjectIds.parse(userId), page);
    if (!result) throw new NotFoundException('User not found');
    return result;
  }

  list(page: PageRequest, search?: string): Promise<Page<UserView>> {
    return this.users.findAll(page, search || undefined);
  }

  async get(userId: string): Promise<UserWithRole> {
    const user = await this.users.findByIdWithRole(ObjectIds.parse(userId));
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async create(principal: Principal, dto: CreateUserDto): Promise<UserWithRole> {
    const role = await this.resolveAssignableRole(principal, dto.role_id);
    const user = await this.users.create({
      name: dto.name,
      email: dto.email,
      password: dto.password,
      interests: dto.interests,
      role_id: role._id,
    });
    return this.users.withRole(user);
  }

  async update(principal: Principal, userId: string, dto: UpdateUserDto): Promise<UserWithRole> {
    const user = await this.loadManageableUser(principal, userId);
    const { role_id: roleId, ...fields } = dto;
    if (roleId) user.role_id = (await this.resolveAssignableRole(principal, roleId))._id;
    user.set(fields);
    await this.users.save(user);
    return this.users.withRole(user);
  }

  async setStatus(principal: Principal, userId: string, dto: UserStatusDto): Promise<UserWithRole> {
    const user = await this.loadManageableUser(principal, userId);
    user.isActive = dto.isActive;
    await this.users.save(user);
    return this.users.withRole(user);
  }

  /** The role must exist and grant nothing the acting user doesn't hold (no privilege escalation). */
  private async resolveAssignableRole(principal: Principal, roleId?: string): Promise<RoleEntity> {
    const role = roleId
      ? await this.roles.findById(ObjectIds.parse(roleId))
      : await this.roles.findByName(RoleName.DEFAULT);
    if (!role) throw new BadRequestException('Role does not exist');
    principal.assertHolds(
      await this.authorization.getPermissions(role._id),
      'You cannot assign a role with permissions you do not have',
    );
    return role;
  }

  /** Loads a user that the acting user is allowed to manage (their role must not out-rank the actor). */
  private async loadManageableUser(principal: Principal, userId: string): Promise<UserDocument> {
    const id = ObjectIds.parse(userId);
    if (id.equals(principal.id)) throw new BadRequestException('Use your profile to change your own account');
    const user = await this.users.findById(id);
    if (!user) throw new NotFoundException('User not found');
    principal.assertHolds(
      await this.authorization.getPermissions(user.role_id),
      'You cannot manage a user with more permissions than you',
    );
    return user;
  }
}
