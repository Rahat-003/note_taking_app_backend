import { type HydratedDocument, Schema, Types, model } from 'mongoose';

export interface NoteEntity {
  _id: Types.ObjectId;
  /** Foreign key to users._id: the note's owner. */
  user_id: Types.ObjectId;
  title: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

export type NoteDocument = HydratedDocument<NoteEntity>;

export interface NoteUserSummary {
  _id: Types.ObjectId;
  name: string;
  email: string;
}

/** Lean note with its `user` virtual (the owner) populated. */
export type NoteView = NoteEntity & { user: NoteUserSummary | null };

const noteSchema = new Schema<NoteEntity>(
  {
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    content: { type: String, default: '', maxlength: 20000 },
  },
  { timestamps: true, versionKey: false },
);

// "My notes" list: equality on user_id, newest first via _id. Also serves countDocuments({ user_id }).
// Admin "all notes" list and GET/PATCH/DELETE by id are served by the built-in _id index.
noteSchema.index({ user_id: 1, _id: -1 });

/** The owner's user document, loaded with populate('user'). */
noteSchema.virtual('user', { ref: 'User', localField: 'user_id', foreignField: '_id', justOne: true });

export const NoteModel = model<NoteEntity>('Note', noteSchema);
