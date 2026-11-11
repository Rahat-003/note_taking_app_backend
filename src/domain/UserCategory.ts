import { Schema, Types, model } from 'mongoose';

// Which categories a user's notes use, and how many notes per category. Kept in sync when notes are
// created, edited or deleted, so a user's categories are read without scanning their notes.
export interface UserCategoryEntity {
  _id: Types.ObjectId;
  /** Foreign key to users._id. */
  user_id: Types.ObjectId;
  /** Foreign key to categories._id. */
  category_id: Types.ObjectId;
  noteCount: number;
}

const userCategorySchema = new Schema<UserCategoryEntity>(
  {
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    category_id: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
    noteCount: { type: Number, required: true, min: 0 },
  },
  { versionKey: false, collection: 'user_categories' },
);

// A user's categories (match on user_id), the counter upsert, and cleanup when the user is deleted.
userCategorySchema.index({ user_id: 1, category_id: 1 }, { unique: true });

export const UserCategoryModel = model<UserCategoryEntity>('UserCategory', userCategorySchema);
