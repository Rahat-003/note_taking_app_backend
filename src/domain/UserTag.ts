import { Schema, Types, model } from 'mongoose';

// Which tags a user's notes use, and how many notes per tag. Kept in sync when notes are created,
// edited or deleted, so a user's tags are read without scanning their notes.
export interface UserTagEntity {
  _id: Types.ObjectId;
  /** Foreign key to users._id. */
  user_id: Types.ObjectId;
  /** Foreign key to tags._id. */
  tag_id: Types.ObjectId;
  noteCount: number;
}

const userTagSchema = new Schema<UserTagEntity>(
  {
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    tag_id: { type: Schema.Types.ObjectId, ref: 'Tag', required: true },
    noteCount: { type: Number, required: true, min: 0 },
  },
  { versionKey: false, collection: 'user_tags' },
);

// A user's tags (match on user_id), the counter upserts, and cleanup when the user is deleted.
userTagSchema.index({ user_id: 1, tag_id: 1 }, { unique: true });

export const UserTagModel = model<UserTagEntity>('UserTag', userTagSchema);
