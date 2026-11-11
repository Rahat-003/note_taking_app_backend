import { Schema, Types, model } from 'mongoose';

export interface RoleEntity {
  _id: Types.ObjectId;
  name: string;
  description: string;
  /** System roles ("admin", "user") cannot be deleted; "admin" permissions cannot be edited. */
  system: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/** A role together with the permission keys it grants. */
export type RoleView = RoleEntity & { permissions: string[] };

const roleSchema = new Schema<RoleEntity>(
  {
    name: { type: String, required: true, trim: true, lowercase: true, maxlength: 50 },
    description: { type: String, default: '', maxlength: 200 },
    system: { type: Boolean, default: false },
  },
  { timestamps: true, versionKey: false, collection: 'roles' },
);

// Lookup by name (default role at registration, bootstrap), uniqueness, and the role list sorted by name.
roleSchema.index({ name: 1 }, { unique: true });

export const RoleModel = model<RoleEntity>('Role', roleSchema);
