import { type HydratedDocument, Schema, Types, model } from 'mongoose';
import type { LabelSummary } from './Label';

/** Notes list sort keys. */
// archivedAt orders the archive (one user's archived notes) only.
export const NOTE_SORT_FIELDS = ['createdAt', 'updatedAt', 'archivedAt'] as const;
export type NoteSortField = (typeof NOTE_SORT_FIELDS)[number];

export interface NoteEntity {
  _id: Types.ObjectId;
  /** Foreign key to users._id: the note's owner. */
  user_id: Types.ObjectId;
  title: string;
  content: string;
  /** Archived notes are kept but left out of the notes list unless asked for (?isArchived=). */
  isArchived: boolean;
  /** When the note was archived; null when it is not archived. Orders the archive, most recently archived first. */
  archivedAt: Date | null;
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
    archivedAt: { type: Date, default: null },
    pinned_at: { type: Date, default: null },
    category_id: { type: Schema.Types.ObjectId, ref: 'Category' },
    tag_ids: { type: [{ type: Schema.Types.ObjectId, ref: 'Tag' }], default: [] },
  },
  { timestamps: true, versionKey: false },
);

// "My notes" sorted by created date (_id order = creation order) and countDocuments({ user_id }).
// The isArchived filter is applied to the rows this index finds for one user (as it is on the indexes below).
// Admin "all notes" by created date and GET/PATCH/DELETE by id use the built-in _id index.
// pinned_at comes right after the equality fields so one user's pinned notes (most recently pinned
// first; null = not pinned sorts last) are read before the rest without an in-memory sort.
noteSchema.index({ user_id: 1, pinned_at: -1, _id: -1 });
// "My notes" sorted by updated date.
noteSchema.index({ user_id: 1, pinned_at: -1, updatedAt: -1 });
// Admin "all notes" sorted by updated date.
noteSchema.index({ updatedAt: -1 });
// Category / tag filters (?category_id= / ?tag_id=) have no index of their own: the user_id indexes above
// narrow the scan to one user's notes, and the filter is applied to those (no collection scan).
// The archive: one user's archived notes, most recently archived first, and its count. Partial, so it
// holds archived notes only and stays small; queries must include isArchived: true to use it.
noteSchema.index({ user_id: 1, archivedAt: -1, _id: -1 }, { partialFilterExpression: { isArchived: true } });
// Search by title and content (?q=). Word-based: case-insensitive, with English stemming.
noteSchema.index({ title: 'text', content: 'text' });

/** The owner's user document, loaded with populate('user'). */
noteSchema.virtual('user', { ref: 'User', localField: 'user_id', foreignField: '_id', justOne: true });
/** The category document, loaded with populate('category'). */
noteSchema.virtual('category', { ref: 'Category', localField: 'category_id', foreignField: '_id', justOne: true });
/** The tag documents, loaded with populate('tags'). */
noteSchema.virtual('tags', { ref: 'Tag', localField: 'tag_ids', foreignField: '_id' });

export const NoteModel = model<NoteEntity>('Note', noteSchema);
