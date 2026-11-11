import { type HydratedDocument, Schema, Types, model } from 'mongoose';

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
  /** Optional single label, lowercase. */
  category?: string;
  /** Lowercase labels. */
  tags: string[];
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
    status: { type: String, enum: NOTE_STATUSES, default: 'active', required: true },
    category: { type: String, trim: true, lowercase: true, maxlength: 50 },
    tags: { type: [{ type: String, trim: true, lowercase: true, maxlength: 30 }], default: [] },
  },
  { timestamps: true, versionKey: false },
);

// "My notes" sorted by created date (_id order = creation order) and countDocuments({ user_id }).
// status / category / tag filters are applied to the rows this index finds for one user.
// Admin "all notes" by created date and GET/PATCH/DELETE by id use the built-in _id index.
noteSchema.index({ user_id: 1, _id: -1 });
// "My notes" sorted by updated date.
noteSchema.index({ user_id: 1, updatedAt: -1 });
// Admin "all notes" sorted by updated date.
noteSchema.index({ updatedAt: -1 });
// Search by title and content (?q=). Word-based: case-insensitive, with English stemming.
noteSchema.index({ title: 'text', content: 'text' });

/** The owner's user document, loaded with populate('user'). */
noteSchema.virtual('user', { ref: 'User', localField: 'user_id', foreignField: '_id', justOne: true });

export const NoteModel = model<NoteEntity>('Note', noteSchema);
