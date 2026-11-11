import type { PipelineStage, Types } from 'mongoose';
import { injectable } from 'tsyringe';
import { type RoleGrant, RolePermissionModel } from '../../domain/RolePermission';
import type { RolePermissionRepository } from '../RolePermissionRepository';

/** Stages allowed inside a $lookup sub-pipeline (everything but $out / $merge). */
type SubPipelineStage = Exclude<PipelineStage, PipelineStage.Out | PipelineStage.Merge>;

/** Joins each grant to its permission document (_id index) to read the permission key. */
export const PERMISSION_KEY_LOOKUP: SubPipelineStage[] = [
  {
    $lookup: {
      from: 'permissions',
      localField: 'permission_id',
      foreignField: '_id',
      as: 'permissionDoc',
      pipeline: [{ $project: { _id: 0, key: 1 } }],
    },
  },
  { $unwind: '$permissionDoc' },
];

@injectable()
export class MongoRolePermissionRepository implements RolePermissionRepository {
  async findActiveKeysByRole(roleId: Types.ObjectId): Promise<string[]> {
    const rows = await RolePermissionModel.aggregate<{ key: string }>([
      { $match: { role_id: roleId, isActive: true } },
      ...PERMISSION_KEY_LOOKUP,
      { $project: { _id: 0, key: '$permissionDoc.key' } },
    ]).exec();
    return rows.map((r) => r.key);
  }

  findGrantsByRole(roleId: Types.ObjectId): Promise<RoleGrant[]> {
    return RolePermissionModel.aggregate<RoleGrant>([
      { $match: { role_id: roleId } },
      ...PERMISSION_KEY_LOOKUP,
      { $project: { _id: 0, permission_id: 1, key: '$permissionDoc.key', isActive: 1 } },
      { $sort: { key: 1 } },
    ]).exec();
  }

  async grant(roleId: Types.ObjectId, permissionIds: readonly Types.ObjectId[]): Promise<void> {
    if (!permissionIds.length) return;
    await RolePermissionModel.bulkWrite(
      permissionIds.map((permissionId) => ({
        updateOne: {
          filter: { role_id: roleId, permission_id: permissionId },
          update: { $setOnInsert: { role_id: roleId, permission_id: permissionId, isActive: true } },
          upsert: true,
        },
      })),
    );
  }

  async revokeAllExcept(roleId: Types.ObjectId, permissionIds: readonly Types.ObjectId[]): Promise<void> {
    await RolePermissionModel.deleteMany({ role_id: roleId, permission_id: { $nin: [...permissionIds] } }).exec();
  }

  async setActive(roleId: Types.ObjectId, permissionId: Types.ObjectId, isActive: boolean): Promise<boolean> {
    const { matchedCount } = await RolePermissionModel.updateOne(
      { role_id: roleId, permission_id: permissionId },
      { $set: { isActive } },
    ).exec();
    return matchedCount > 0;
  }

  async deleteByRole(roleId: Types.ObjectId): Promise<void> {
    await RolePermissionModel.deleteMany({ role_id: roleId }).exec();
  }
}
