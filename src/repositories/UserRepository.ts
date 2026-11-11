import type { Types } from 'mongoose';
import type { Page } from '../common/pagination/Page';
import type { PageRequest } from '../common/pagination/PageRequest';
import type { PostSummary } from '../domain/Post';
import type { UserDocument, UserSummary, UserView, UserWithRole } from '../domain/User';

export interface NewUser {
  name: string;
  email: string;
  password: string;
  role: Types.ObjectId;
  interests?: string[];
}

export interface InterestGroup {
  interest: string;
  count: number;
  users: UserSummary[];
}

export interface UserPosts {
  user: UserSummary;
  posts: Page<PostSummary>;
}

export interface UserRepository {
  /** _id index. */
  findById(id: Types.ObjectId): Promise<UserDocument | null>;
  /** _id index; role populated with { _id, name }. */
  findByIdWithRole(id: Types.ObjectId): Promise<UserWithRole | null>;
  /** { email: 1 } unique index; includes the password hash for login. */
  findByEmailWithPassword(email: string): Promise<UserDocument | null>;
  /** { email: 1 } unique index. */
  existsByEmail(email: string): Promise<boolean>;
  /** { role: 1 } index. */
  existsByRole(roleId: Types.ObjectId): Promise<boolean>;
  /** Newest first via the _id index; total from collection metadata. */
  findAll(page: PageRequest): Promise<Page<UserView>>;
  create(user: NewUser): Promise<UserDocument>;
  /** save() so a changed password goes through the hashing hook. */
  save(user: UserDocument | UserWithRole): Promise<void>;
  withRole(user: UserDocument): Promise<UserWithRole>;
  deleteById(id: Types.ObjectId): Promise<void>;
  /** Aggregation Scenario 1: a single aggregate() on the { interests: 1 } multikey index. */
  groupByInterest(interest: string, page: PageRequest): Promise<Page<InterestGroup>>;
  /** Aggregation Scenario 2: a single aggregate() with $lookup into posts ({ author: 1, _id: -1 }). */
  findWithPosts(userId: Types.ObjectId, page: PageRequest): Promise<UserPosts | null>;
}
