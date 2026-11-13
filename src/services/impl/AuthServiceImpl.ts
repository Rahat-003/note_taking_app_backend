import { inject, injectable } from 'tsyringe';
import { BadRequestException } from '../../common/exceptions/BadRequestException';
import type { ChangePasswordDto } from '../../dto/auth/ChangePasswordDto';
import { UnauthorizedException } from '../../common/exceptions/UnauthorizedException';
import { RoleName } from '../../common/RoleName';
import { Tokens } from '../../common/Tokens';
import type { UserDocument } from '../../domain/User';
import type { LoginDto } from '../../dto/auth/LoginDto';
import type { RegisterDto } from '../../dto/auth/RegisterDto';
import type { UpdateProfileDto } from '../../dto/auth/UpdateProfileDto';
import type { RoleRepository } from '../../repositories/RoleRepository';
import type { UserRepository } from '../../repositories/UserRepository';
import type { AuthResult, AuthService, Session } from '../AuthService';
import type { AuthorizationService } from '../AuthorizationService';
import { Principal } from '../Principal';
import type { TokenService } from '../TokenService';

@injectable()
export class AuthServiceImpl implements AuthService {
  constructor(
    @inject(Tokens.UserRepository) private readonly users: UserRepository,
    @inject(Tokens.RoleRepository) private readonly roles: RoleRepository,
    @inject(Tokens.AuthorizationService) private readonly authorization: AuthorizationService,
    @inject(Tokens.TokenService) private readonly tokens: TokenService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResult> {
    // Self-registered accounts always get the default role; the request cannot choose one.
    const role = await this.roles.findByName(RoleName.DEFAULT);
    if (!role) throw new Error(`Role "${RoleName.DEFAULT}" is missing; run npm run bootstrap`);
    const user = await this.users.create({ name: dto.name, email: dto.email, password: dto.password, role_id: role._id });
    return this.authResult(user);
  }

  async login(dto: LoginDto): Promise<AuthResult> {
    const user = await this.users.findByEmailWithPassword(dto.email.toLowerCase());
    if (!user || !(await user.comparePassword(dto.password))) {
      throw new UnauthorizedException('Invalid email or password');
    }
    return this.authResult(user);
  }

  async authenticate(token: string): Promise<Principal> {
    const user = await this.users.findByIdWithRole(this.tokens.verify(token));
    if (!user) throw new UnauthorizedException('User no longer exists');
    const permissions = user.role ? await this.authorization.getPermissions(user.role._id) : [];
    return new Principal(user, new Set(permissions));
  }

  getSession(principal: Principal): Session {
    return { user: principal.user, permissions: [...principal.permissions] };
  }

  async updateProfile(principal: Principal, dto: UpdateProfileDto): Promise<Session> {
    principal.user.set({ ...dto });
    await this.users.save(principal.user);
    return this.getSession(principal);
  }

  async changePassword(principal: Principal, dto: ChangePasswordDto): Promise<void> {
    if (dto.newPassword !== dto.confirmPassword) {
      throw new BadRequestException('The new password and its confirmation do not match', [
        { field: 'confirmPassword', messages: ['does not match the new password'] },
      ]);
    }
    const user = await this.users.findByEmailWithPassword(principal.user.email);
    if (!user || !(await user.comparePassword(dto.currentPassword))) {
      throw new BadRequestException('The current password is not correct', [{ field: 'currentPassword', messages: ['is not correct'] }]);
    }
    if (await user.comparePassword(dto.newPassword)) {
      throw new BadRequestException('The new password must be different from the current one', [
        { field: 'newPassword', messages: ['must be different from the current password'] },
      ]);
    }
    user.password = dto.newPassword; // hashed by the pre-save hook
    await this.users.save(user);
  }

  private async authResult(user: UserDocument): Promise<AuthResult> {
    const withRole = await this.users.withRole(user);
    const permissions = withRole.role ? await this.authorization.getPermissions(withRole.role._id) : [];
    return { token: this.tokens.sign(user._id), user: withRole, permissions };
  }
}
