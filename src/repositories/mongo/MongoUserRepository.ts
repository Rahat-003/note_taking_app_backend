import type { FilterQuery, Types } from 'mongoose';
import { injectable } from 'tsyringe';
import { Page } from '../../common/pagination/Page';
import { PageRequest } from '../../common/pagination/PageRequest';
import { type RoleSummary, type UserDocument, type UserEntity, UserModel, type UserView, type UserWithRole } from '../../domain/User';
import { UserAggregations } from '../aggregations/UserAggregations';
import type { InterestGroup, NewUser, UserRepository } from '../UserRepository';

const ROLE_FIELDS = 'name';

const escapeRegex = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Users whose email starts with `search` (emails are stored lowercase). An anchored, case-sensitive prefix
 * regex is a bounded range scan on the { email: 1 } index, which also returns the matches in email order.
 */
export function userSearchFilter(search: string): FilterQuery<UserEntity> {
  return { email: { $regex: `^${escapeRegex(search.trim().toLowerCase())}` } };
}

@injectable()
export class MongoUserRepository implements UserRepository {
  findById(id: Types.ObjectId): Promise<UserDocument | null> {
    return UserModel.findById(id).exec();
  }

  findByIdWithRole(id: Types.ObjectId): Promise<UserWithRole | null> {
    return UserModel.findById(id).populate<{ role: RoleSummary | null }>('role', ROLE_FIELDS).exec();
  }

  findByEmailWithPassword(email: string): Promise<UserDocument | null> {
    return UserModel.findOne({ email }).select('+password').exec();
  }

  async existsByEmail(email: string): Promise<boolean> {
    return Boolean(await UserModel.exists({ email: email.toLowerCase() }));
  }

  async existsByRole(roleId: Types.ObjectId): Promise<boolean> {
    return Boolean(await UserModel.exists({ role_id: roleId }));
  }

  async findAll(page: PageRequest, search?: string): Promise<Page<UserView>> {
    const filter = search ? userSearchFilter(search) : {};
    const [data, total] = await Promise.all([
      UserModel.find(filter)
        .sort(search ? { email: 1 } : { _id: -1 })
        .skip(page.skip)
        .limit(page.limit)
        .select('-__v')
        .populate('role', ROLE_FIELDS)
        .lean<UserView[]>()
        .exec(),
      search ? UserModel.countDocuments(filter).exec() : UserModel.estimatedDocumentCount().exec(),
    ]);
    return Page.of(data, total, page);
  }

  create(user: NewUser): Promise<UserDocument> {
    return UserModel.create(user);
  }

  async save(user: UserDocument | UserWithRole): Promise<void> {
    await user.save();
  }

  async withRole(user: UserDocument): Promise<UserWithRole> {
    // populate() mutates and returns the same document; Mongoose's instance-level typing
    // differs from the query-level one used by findByIdWithRole, hence the cast.
    return (await user.populate('role', ROLE_FIELDS)) as unknown as UserWithRole;
  }

  async groupByInterest(interest: string, page: PageRequest): Promise<Page<InterestGroup>> {
    const [result] = await UserModel.aggregate<{ data: InterestGroup[]; total: { count: number }[] }>(
      UserAggregations.usersByInterest(interest, page.skip, page.limit),
    ).exec();
    return Page.of(result?.data ?? [], result?.total[0]?.count ?? 0, page);
  }

}
