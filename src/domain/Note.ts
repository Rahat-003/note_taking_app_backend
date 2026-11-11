import { type HydratedDocument, Schema, Types, model } from 'mongoose';
import type { LabelSummary } from './Label';

export const NOTE_STATUSES = ['active', 'archived'] as const;
export type NoteStatus = (typeof NOTE_STATUSES)[number];

/** Notes list sort keys. */
export const NOTE_SORT_FIELDS = ['createdAt', 'updatedAt'] as const;
export type NoteSortField = (typeof NOTE_SORT_FIELDS)[number];

export interface NoteEntity {
  _id: Types.ObjectId;
  /** Foreign key to users._id: the note's owner. */
  user_id: Types.ObjectId;
  title: string;
  content: string;
  status: NoteStatus;
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
    status: { type: String, enum: NOTE_STATUSES, default: 'active', required: true },
    category_id: { type: Schema.Types.ObjectId, ref: 'Category' },
    tag_ids: { type: [{ type: Schema.Types.ObjectId, ref: 'Tag' }], default: [] },
  },
  { timestamps: true, versionKey: false },
);

// "My notes" sorted by created date (_id order = creation order) and countDocuments({ user_id }).
// The status filter is applied to the rows this index finds for one user.
// Admin "all notes" by created date and GET/PATCH/DELETE by id use the built-in _id index.
noteSchema.index({ user_id: 1, _id: -1 });
// "My notes" sorted by updated date.
noteSchema.index({ user_id: 1, updatedAt: -1 });
// Admin "all notes" sorted by updated date.
noteSchema.index({ updatedAt: -1 });
// "My notes" in one category / with one tag (?category_id= / ?tag_id=), newest first, and their counts.
noteSchema.index({ user_id: 1, category_id: 1, _id: -1 });
noteSchema.index({ user_id: 1, tag_ids: 1, _id: -1 });
// Search by title and content (?q=). Word-based: case-insensitive, with English stemming.
noteSchema.index({ title: 'text', content: 'text' });

/** The owner's user document, loaded with populate('user'). */
noteSchema.virtual('user', { ref: 'User', localField: 'user_id', foreignField: '_id', justOne: true });
/** The category document, loaded with populate('category'). */
noteSchema.virtual('category', { ref: 'Category', localField: 'category_id', foreignField: '_id', justOne: true });
/** The tag documents, loaded with populate('tags'). */
noteSchema.virtual('tags', { ref: 'Tag', localField: 'tag_ids', foreignField: '_id' });

export const NoteModel = model<NoteEntity>('Note', noteSchema);
