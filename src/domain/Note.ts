import { type HydratedDocument, Schema, Types, model } from 'mongoose';
import type { LabelSummary } from './Label';

export interface NoteEntity {
  _id: Types.ObjectId;
  /** Foreign key to users._id: the note's owner. */
  user_id: Types.ObjectId;
  title: string;
  content: string;
  /** Archived notes are kept but left out of the notes list unless asked for (?isArchived=). */
  isArchived: boolean;
  /** When the note was pinned; null when it is not pinned. Pinned notes come first in their owner's list. */
  pinned_at: Date | null;
  /** Foreign key to categories._id (optional). */
  category_id?: Types.ObjectId;
  /** Foreign keys to tags._id. */
  tag_ids: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

export type NoteDocument = HydratedDocument<NoteEntity>;

export interface NoteUserSummary {
  _id: Types.ObjectId;
  name: string;
  email: string;
}

/** Lean note with its `user` (owner), `category` and `tags` virtuals populated. */
export type NoteView = NoteEntity & { user: NoteUserSummary | null; category: LabelSummary | null; tags: LabelSummary[] };

const noteSchema = new Schema<NoteEntity>(
  {
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    content: { type: String, default: '', maxlength: 20000 },
    isArchived: { type: Boolean, default: false, required: true },
    pinned_at: { type: Date, default: null },
    category_id: { type: Schema.Types.ObjectId, ref: 'Category' },
    tag_ids: { type: [{ type: Schema.Types.ObjectId, ref: 'Tag' }], default: [] },
  },
  { timestamps: true, versionKey: false },
);

// The one secondary index on notes. "A user listing their notes": equality on user_id, then pinned notes
// first (most recently pinned first; null = not pinned sorts last), then newest first (_id order = creation
// order), so the page is read straight from the index; also its countDocuments({ user_id }), the admin's
// ?user_id= view and the cascade delete of a user's notes. The isArchived / category / tag filters are applied
// to the rows it finds for that one user (never a collection scan), so they need no index of their own.
// Admin "all notes" (newest first) and GET / PATCH / DELETE by id use the built-in _id index.
noteSchema.index({ user_id: 1, pinned_at: -1, _id: -1 });

/** The owner's user document, loaded with populate('user'). */
noteSchema.virtual('user', { ref: 'User', localField: 'user_id', foreignField: '_id', justOne: true });
/** The category document, loaded with populate('category'). */
noteSchema.virtual('category', { ref: 'Category', localField: 'category_id', foreignField: '_id', justOne: true });
/** The tag documents, loaded with populate('tags'). */
noteSchema.virtual('tags', { ref: 'Tag', localField: 'tag_ids', foreignField: '_id' });

export const NoteModel = model<NoteEntity>('Note', noteSchema);
