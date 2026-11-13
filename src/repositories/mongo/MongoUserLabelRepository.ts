import type { Model, Types } from 'mongoose';
import { Page } from '../../common/pagination/Page';
import { PageRequest } from '../../common/pagination/PageRequest';
import type { UserLabel } from '../../domain/Label';
import type { UserLabelRepository } from '../UserLabelRepository';

/**
 * Shared implementation of user_categories and user_tags. Each document is
 * { user_id, <labelField>, noteCount } with a unique { user_id, <labelField> } index.
 */
export abstract class MongoUserLabelRepository implements UserLabelRepository {
  protected constructor(
    private readonly model: Model<any>,
    private readonly labelField: 'category_id' | 'tag_id',
    private readonly labelCollection: 'categories' | 'tags',
  ) {}

  async findByUser(userId: Types.ObjectId, page: PageRequest): Promise<Page<UserLabel>> {
    const [data, total] = await Promise.all([
      this.model
        .aggregate<UserLabel>([
          { $match: { user_id: userId } },
          {
            $lookup: {
              from: this.labelCollection,
              localField: this.labelField,
              foreignField: '_id',
              as: 'label',
              pipeline: [{ $project: { name: 1 } }],
            },
          },
          { $unwind: '$label' },
          // A user has few labels, so sorting them by name after the lookup is cheap.
          { $sort: { 'label.name': 1 } },
          { $skip: page.skip },
          { $limit: page.limit },
          { $project: { _id: '$label._id', name: '$label.name', noteCount: 1 } },
        ])
        .exec(),
      this.model.countDocuments({ user_id: userId }).exec(),
    ]);
    return Page.of(data, total, page);
  }

  async adjust(userId: Types.ObjectId, labelIds: readonly Types.ObjectId[], delta: 1 | -1): Promise<void> {
    if (!labelIds.length) return;
    const key = (labelId: Types.ObjectId) => ({ user_id: userId, [this.labelField]: labelId });
    if (delta > 0) {
      await this.model.bulkWrite(
        labelIds.map((labelId) => ({ updateOne: { filter: key(labelId), update: { $inc: { noteCount: 1 } }, upsert: true } })),
      );
      return;
    }
    await this.model.bulkWrite(
      labelIds.map((labelId) => ({ updateOne: { filter: { ...key(labelId), noteCount: { $gt: 0 } }, update: { $inc: { noteCount: -1 } } } })),
    );
    await this.model.deleteMany({ user_id: userId, [this.labelField]: { $in: [...labelIds] }, noteCount: { $lte: 0 } }).exec();
  }
}
