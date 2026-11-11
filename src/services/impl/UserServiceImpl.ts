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
import type { NoteRepository } from '../../repositories/NoteRepository';
import type { PostRepository } from '../../repositories/PostRepository';
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
    @inject(Tokens.NoteRepository) private readonly notes: NoteRepository,
    @inject(Tokens.PostRepository) private readonly posts: PostRepository,
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

  list(page: PageRequest): Promise<Page<UserView>> {
    return this.users.findAll(page);
  }

  async get(userId: string): Promise<UserWithRole> {
    const user = await this.users.findByIdWithRole(ObjectIds.parse(userId));
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async create(principal: Principal, dto: CreateUserDto): Promise<UserWithRole> {
    const role = await this.resolveAssignableRole(principal, dto.role);
    const user = await this.users.create({
      name: dto.name,
      email: dto.email,
      password: dto.password,
      interests: dto.interests,
      role: role._id,
    });
    return this.users.withRole(user);
  }

  async update(principal: Principal, userId: string, dto: UpdateUserDto): Promise<UserWithRole> {
    const user = await this.loadManageableUser(principal, userId);
    const { role, ...fields } = dto;
    if (role) user.role = (await this.resolveAssignableRole(principal, role))._id;
    user.set(fields);
    await this.users.save(user);
    return this.users.withRole(user);
  }

  async delete(principal: Principal, userId: string): Promise<void> {
    const user = await this.loadManageableUser(principal, userId);
    await this.users.deleteById(user._id);
    // Cascade: { owner: 1, _id: -1 } and { author: 1, _id: -1 } serve these filters.
    await Promise.all([this.notes.deleteByOwner(user._id), this.posts.deleteByAuthor(user._id)]);
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
      await this.authorization.getPermissions(user.role),
      'You cannot manage a user with more permissions than you',
    );
    return user;
  }
}
