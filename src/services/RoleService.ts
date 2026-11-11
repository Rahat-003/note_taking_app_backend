import type { Page } from '../common/pagination/Page';
import type { PageRequest } from '../common/pagination/PageRequest';
import type { RoleView } from '../domain/Role';
import type { CreateRoleDto } from '../dto/role/CreateRoleDto';
import type { SetGrantActiveDto } from '../dto/role/SetGrantActiveDto';
import type { UpdateRoleDto } from '../dto/role/UpdateRoleDto';
import type { Principal } from './Principal';

export interface RoleService {
  list(page: PageRequest): Promise<Page<RoleView>>;
  get(roleId: string): Promise<RoleView>;
  create(principal: Principal, dto: CreateRoleDto): Promise<RoleView>;
  update(principal: Principal, roleId: string, dto: UpdateRoleDto): Promise<RoleView>;
  /** Turns one of the role's grants on or off; only active grants give access. */
  setGrantActive(principal: Principal, roleId: string, permissionId: string, dto: SetGrantActiveDto): Promise<RoleView>;
  delete(roleId: string): Promise<void>;
}
