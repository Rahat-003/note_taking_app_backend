import type { LoginDto } from '../dto/auth/LoginDto';
import type { RegisterDto } from '../dto/auth/RegisterDto';
import type { UpdateProfileDto } from '../dto/auth/UpdateProfileDto';
import type { UserWithRole } from '../domain/User';
import type { Principal } from './Principal';

export interface Session {
  user: UserWithRole;
  permissions: string[];
}

export interface AuthResult extends Session {
  token: string;
}

export interface AuthService {
  register(dto: RegisterDto): Promise<AuthResult>;
  login(dto: LoginDto): Promise<AuthResult>;
  /** Verifies the token and loads the user and their permissions; throws 401 when invalid. */
  authenticate(token: string): Promise<Principal>;
  getSession(principal: Principal): Session;
  updateProfile(principal: Principal, dto: UpdateProfileDto): Promise<Session>;
}
