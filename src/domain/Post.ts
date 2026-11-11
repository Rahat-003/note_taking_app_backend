import { type HydratedDocument, Schema, Types, model } from 'mongoose';

export interface PostEntity {
  _id: Types.ObjectId;
  author: Types.ObjectId;
  title: string;
  body: string;
  createdAt: Date;
  updatedAt: Date;
}

export type PostDocument = HydratedDocument<PostEntity>;

export interface AuthorSummary {
  _id: Types.ObjectId;
  name: string;
}

/** Lean post with its author populated. */
export type PostView = Omit<PostEntity, 'author'> & { author: AuthorSummary | null };

/** A post as returned inside the Scenario 2 $lookup. */
export type PostSummary = Omit<PostEntity, 'author'>;

const postSchema = new Schema<PostEntity>(
  {
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    body: { type: String, required: true, maxlength: 20000 },
  },
  { timestamps: true, versionKey: false },
);

// $lookup foreignField (author) + newest-first sort inside the lookup pipeline.
// Public post feed and GET by id are served by the built-in _id index.
postSchema.index({ author: 1, _id: -1 });

export const PostModel = model<PostEntity>('Post', postSchema);
