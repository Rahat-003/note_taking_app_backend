import type { Page } from '../common/pagination/Page';
import type { PageRequest } from '../common/pagination/PageRequest';
import type { RoleView } from '../domain/Role';
import type { CreateRoleDto } from '../dto/role/CreateRoleDto';
import type { UpdateRoleDto } from '../dto/role/UpdateRoleDto';
import type { Principal } from './Principal';

export interface RoleService {
  list(page: PageRequest): Promise<Page<RoleView>>;
  get(roleId: string): Promise<RoleView>;
  create(principal: Principal, dto: CreateRoleDto): Promise<RoleView>;
  update(principal: Principal, roleId: string, dto: UpdateRoleDto): Promise<RoleView>;
  delete(roleId: string): Promise<void>;
}
