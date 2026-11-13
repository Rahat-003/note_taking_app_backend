import { type HydratedDocument, Schema, Types, model } from 'mongoose';

export interface PostEntity {
  _id: Types.ObjectId;
  /** Foreign key to users._id: the post's author. */
  user_id: Types.ObjectId;
  title: string;
  body: string;
  createdAt: Date;
  updatedAt: Date;
}

export type PostDocument = HydratedDocument<PostEntity>;

/** A post as returned inside the Scenario 2 $lookup. */
export type PostSummary = Omit<PostEntity, 'user_id'>;

const postSchema = new Schema<PostEntity>(
  {
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    body: { type: String, required: true, maxlength: 20000 },
  },
  { timestamps: true, versionKey: false },
);

// Scenario 2: the $lookup matches posts on user_id (foreignField) and pages them newest first
// (_id order = creation order); its second $lookup counts them. One index serves all three.
postSchema.index({ user_id: 1, _id: -1 });

export const PostModel = model<PostEntity>('Post', postSchema);
