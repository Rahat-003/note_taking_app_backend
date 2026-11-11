import type { Types } from 'mongoose';
import { injectable } from 'tsyringe';
import { Page } from '../../common/pagination/Page';
import { PageRequest } from '../../common/pagination/PageRequest';
import { type RoleEntity, RoleModel, type RoleView } from '../../domain/Role';
import type { RoleFields, RoleRepository } from '../RoleRepository';
import { PERMISSION_KEY_LOOKUP } from './MongoRolePermissionRepository';

@injectable()
export class MongoRoleRepository implements RoleRepository {
  async findAllWithPermissions(page: PageRequest): Promise<Page<RoleView>> {
    const [data, total] = await Promise.all([
      RoleModel.aggregate<RoleView>([
        { $sort: { name: 1 } },
        { $skip: page.skip },
        { $limit: page.limit },
        {
          $lookup: {
            from: 'role_permissions',
            localField: '_id',
            foreignField: 'role_id',
            as: 'grants',
            pipeline: [
              ...PERMISSION_KEY_LOOKUP,
              { $project: { _id: 0, permission_id: 1, key: '$permissionDoc.key', isActive: 1 } },
              { $sort: { key: 1 } },
            ],
          },
        },
        // permissions: keys of the active grants only.
        {
          $set: {
            permissions: {
              $map: { input: { $filter: { input: '$grants', cond: '$$this.isActive' } }, in: '$$this.key' },
            },
          },
        },
      ]).exec(),
      RoleModel.estimatedDocumentCount().exec(),
    ]);
    return Page.of(data, total, page);
  }

  findById(id: Types.ObjectId): Promise<RoleEntity | null> {
    return RoleModel.findById(id).lean<RoleEntity>().exec();
  }

  findByName(name: string): Promise<RoleEntity | null> {
    return RoleModel.findOne({ name }).lean<RoleEntity>().exec();
  }

  async create(fields: RoleFields & { name: string }): Promise<RoleEntity> {
    return (await RoleModel.create(fields)).toObject();
  }

  async createIfMissing(fields: RoleFields & { name: string }): Promise<{ role: RoleEntity; created: boolean }> {
    const res = await RoleModel.updateOne({ name: fields.name }, { $setOnInsert: fields }, { upsert: true }).exec();
    const role = await this.findByName(fields.name);
    if (!role) throw new Error(`Role ${fields.name} vanished after upsert`);
    return { role, created: res.upsertedCount === 1 };
  }

  update(id: Types.ObjectId, fields: RoleFields): Promise<RoleEntity | null> {
    return RoleModel.findByIdAndUpdate(id, { $set: fields }, { new: true, runValidators: true }).lean<RoleEntity>().exec();
  }

  async deleteById(id: Types.ObjectId): Promise<void> {
    await RoleModel.deleteOne({ _id: id }).exec();
  }
}
