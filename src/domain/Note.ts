import { type HydratedDocument, Schema, Types, model } from 'mongoose';

export interface NoteEntity {
  _id: Types.ObjectId;
  owner: Types.ObjectId;
  title: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

export type NoteDocument = HydratedDocument<NoteEntity>;

export interface OwnerSummary {
  _id: Types.ObjectId;
  name: string;
  email: string;
}

/** Lean note with its owner populated. */
export type NoteView = Omit<NoteEntity, 'owner'> & { owner: OwnerSummary | null };

const noteSchema = new Schema<NoteEntity>(
  {
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    content: { type: String, default: '', maxlength: 20000 },
  },
  { timestamps: true, versionKey: false },
);

// "My notes" list: equality on owner, newest first via _id. Also serves countDocuments({ owner }).
// Admin "all notes" list and GET/PATCH/DELETE by id are served by the built-in _id index.
noteSchema.index({ owner: 1, _id: -1 });

export const NoteModel = model<NoteEntity>('Note', noteSchema);
