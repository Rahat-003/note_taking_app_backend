import bcrypt from 'bcryptjs';
import { type HydratedDocument, type MergeType, type Model, Schema, Types, model } from 'mongoose';

const BCRYPT_ROUNDS = 12;

export interface UserEntity {
  _id: Types.ObjectId;
  name: string;
  email: string;
  password: string;
  role: Types.ObjectId;
  interests: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface UserMethods {
  comparePassword(candidate: string): Promise<boolean>;
}

export type UserDocument = HydratedDocument<UserEntity, UserMethods>;

export interface RoleSummary {
  _id: Types.ObjectId;
  name: string;
}

/** A user document whose role has been populated with { _id, name }. */
export type UserWithRole = HydratedDocument<MergeType<UserEntity, { role: RoleSummary | null }>, UserMethods>;

/** Lean user as returned by list queries (password is never selected). */
export type UserView = Omit<UserEntity, 'password' | 'role'> & { role: RoleSummary | null };

export interface UserSummary {
  _id: Types.ObjectId;
  name: string;
  email: string;
}

type UserModelType = Model<UserEntity, object, UserMethods>;

const userSchema = new Schema<UserEntity, UserModelType, UserMethods>(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 254 },
    password: { type: String, required: true, select: false },
    role: { type: Schema.Types.ObjectId, ref: 'Role', required: true },
    interests: { type: [{ type: String, trim: true, lowercase: true, maxlength: 50 }], default: [] },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: Record<string, unknown>) {
        delete ret.password;
        delete ret.__v;
        return ret;
      },
    },
  },
);

// Login lookup + uniqueness guarantee.
userSchema.index({ email: 1 }, { unique: true });
// Multikey index backing the "group users by interests" aggregation.
userSchema.index({ interests: 1 });
// "Is this role still assigned?" check before deleting a role.
userSchema.index({ role: 1 });
// Admin user listing and GET by id use the built-in _id index: no extra index.

userSchema.pre('save', async function hashPassword() {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, BCRYPT_ROUNDS);
});

userSchema.method('comparePassword', function comparePassword(this: UserDocument, candidate: string) {
  return bcrypt.compare(candidate, this.password);
});

export const UserModel = model<UserEntity, UserModelType>('User', userSchema);
