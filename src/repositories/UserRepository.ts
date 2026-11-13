import type { Types } from 'mongoose';
import type { Page } from '../common/pagination/Page';
import type { PageRequest } from '../common/pagination/PageRequest';
import type { UserDocument, UserSummary, UserView, UserWithRole } from '../domain/User';

export interface NewUser {
  name: string;
  email: string;
  password: string;
  role_id: Types.ObjectId;
  interests?: string[];
}

export interface InterestGroup {
  interest: string;
  count: number;
  users: UserSummary[];
}

export interface UserRepository {
  /** _id index. */
  findById(id: Types.ObjectId): Promise<UserDocument | null>;
  /** _id index; the `role` virtual (role_id -> roles) populated with { _id, name }. */
  findByIdWithRole(id: Types.ObjectId): Promise<UserWithRole | null>;
  /** { email: 1 } unique index; includes the password hash for login. */
  findByEmailWithPassword(email: string): Promise<UserDocument | null>;
  /** { email: 1 } unique index. */
  existsByEmail(email: string): Promise<boolean>;
  /** { role_id: 1 } index. */
  existsByRole(roleId: Types.ObjectId): Promise<boolean>;
  /**
   * Without a search: newest first via the _id index, total from collection metadata.
   * With one: email prefix, in email order, both from the { email: 1 } index.
   */
  findAll(page: PageRequest, search?: string): Promise<Page<UserView>>;
  create(user: NewUser): Promise<UserDocument>;
  /** save() so a changed password goes through the hashing hook. */
  save(user: UserDocument | UserWithRole): Promise<void>;
  withRole(user: UserDocument): Promise<UserWithRole>;
  /** Aggregation Scenario 1: a single aggregate() on the { interests: 1 } multikey index. */
  groupByInterest(interest: string, page: PageRequest): Promise<Page<InterestGroup>>;
}
