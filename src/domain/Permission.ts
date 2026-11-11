import { Schema, Types, model } from 'mongoose';

// Permission catalog. Keys are defined in bootstrap/permission.json and loaded by `npm run bootstrap`.
export interface PermissionEntity {
  _id: Types.ObjectId;
  key: string;
  description: string;
}

const permissionSchema = new Schema<PermissionEntity>(
  {
    key: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
  },
  { versionKey: false, collection: 'permissions' },
);

// Upsert-by-key in bootstrap, uniqueness, and the catalog list sorted by key.
permissionSchema.index({ key: 1 }, { unique: true });

export const PermissionModel = model<PermissionEntity>('Permission', permissionSchema);
