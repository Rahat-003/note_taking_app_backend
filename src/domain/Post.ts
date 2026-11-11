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

export interface PostUserSummary {
  _id: Types.ObjectId;
  name: string;
}

/** Lean post with its `user` virtual (the author) populated. */
export type PostView = PostEntity & { user: PostUserSummary | null };

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

// $lookup foreignField (user_id) + newest-first sort inside the lookup pipeline.
// Public post feed and GET by id are served by the built-in _id index.
postSchema.index({ user_id: 1, _id: -1 });

/** The author's user document, loaded with populate('user'). */
postSchema.virtual('user', { ref: 'User', localField: 'user_id', foreignField: '_id', justOne: true });

export const PostModel = model<PostEntity>('Post', postSchema);
