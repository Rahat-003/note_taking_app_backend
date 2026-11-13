import type { Page } from '../common/pagination/Page';
import type { PageRequest } from '../common/pagination/PageRequest';
import type { UserView, UserWithRole } from '../domain/User';
import type { CreateUserDto } from '../dto/user/CreateUserDto';
import type { UpdateUserDto } from '../dto/user/UpdateUserDto';
import type { InterestGroup } from '../repositories/UserRepository';
import type { Principal } from './Principal';

export interface UserService {
  groupByInterest(interest: string, page: PageRequest): Promise<Page<InterestGroup>>;
  /** search: name word start or email prefix. */
  list(page: PageRequest, search?: string): Promise<Page<UserView>>;
  get(userId: string): Promise<UserWithRole>;
  create(principal: Principal, dto: CreateUserDto): Promise<UserWithRole>;
  update(principal: Principal, userId: string, dto: UpdateUserDto): Promise<UserWithRole>;
  /** Also deletes the user's notes and their category/tag usage. */
  delete(principal: Principal, userId: string): Promise<void>;
}
