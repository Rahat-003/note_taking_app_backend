import { injectable } from 'tsyringe';
import { Page } from '../../common/pagination/Page';
import { PageRequest } from '../../common/pagination/PageRequest';
import { type PermissionEntity, PermissionModel } from '../../domain/Permission';
import type { PermissionRepository } from '../PermissionRepository';

@injectable()
export class MongoPermissionRepository implements PermissionRepository {
  async findAll(page: PageRequest): Promise<Page<PermissionEntity>> {
    const [data, total] = await Promise.all([
      PermissionModel.find().sort({ key: 1 }).skip(page.skip).limit(page.limit).lean<PermissionEntity[]>().exec(),
      PermissionModel.estimatedDocumentCount().exec(),
    ]);
    return Page.of(data, total, page);
  }

  findByKeys(keys: readonly string[]): Promise<PermissionEntity[]> {
    return PermissionModel.find({ key: { $in: [...keys] } }).lean<PermissionEntity[]>().exec();
  }

  async upsertAll(permissions: ReadonlyArray<{ key: string; description: string }>): Promise<void> {
    if (!permissions.length) return;
    await PermissionModel.bulkWrite(
      permissions.map(({ key, description }) => ({
        updateOne: { filter: { key }, update: { $set: { description } }, upsert: true },
      })),
    );
  }
}
