import type { Types } from 'mongoose';
import { injectable } from 'tsyringe';
import { RolePermissionModel } from '../../domain/RolePermission';
import type { RolePermissionRepository } from '../RolePermissionRepository';

@injectable()
export class MongoRolePermissionRepository implements RolePermissionRepository {
  async findKeysByRole(roleId: Types.ObjectId): Promise<string[]> {
    const rows = await RolePermissionModel.find({ role: roleId }, { _id: 0, permission: 1 })
      .lean<{ permission: string }[]>()
      .exec();
    return rows.map((r) => r.permission);
  }

  async grant(roleId: Types.ObjectId, keys: readonly string[]): Promise<void> {
    if (!keys.length) return;
    await RolePermissionModel.bulkWrite(
      keys.map((permission) => ({
        updateOne: {
          filter: { role: roleId, permission },
          update: { $setOnInsert: { role: roleId, permission } },
          upsert: true,
        },
      })),
    );
  }

  async revokeAllExcept(roleId: Types.ObjectId, keys: readonly string[]): Promise<void> {
    await RolePermissionModel.deleteMany({ role: roleId, permission: { $nin: [...keys] } }).exec();
  }

  async deleteByRole(roleId: Types.ObjectId): Promise<void> {
    await RolePermissionModel.deleteMany({ role: roleId }).exec();
  }
}
