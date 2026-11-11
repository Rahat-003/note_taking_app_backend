import type { Types } from 'mongoose';
import type { Page } from '../common/pagination/Page';
import type { PageRequest } from '../common/pagination/PageRequest';
import type { RoleEntity, RoleView } from '../domain/Role';

export interface RoleFields {
  name?: string;
  description?: string;
  system?: boolean;
}

export interface RoleRepository {
  /** Sorted by { name: 1 }, each role with its permission keys via $lookup on { role: 1, permission: 1 }. */
  findAllWithPermissions(page: PageRequest): Promise<Page<RoleView>>;
  /** _id index. */
  findById(id: Types.ObjectId): Promise<RoleEntity | null>;
  /** { name: 1 } unique index. */
  findByName(name: string): Promise<RoleEntity | null>;
  create(fields: RoleFields & { name: string }): Promise<RoleEntity>;
  /** Inserts the role only if no role has this name ({ name: 1 }). */
  createIfMissing(fields: RoleFields & { name: string }): Promise<{ role: RoleEntity; created: boolean }>;
  update(id: Types.ObjectId, fields: RoleFields): Promise<RoleEntity | null>;
  deleteById(id: Types.ObjectId): Promise<void>;
}
