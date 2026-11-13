import type { Types } from 'mongoose';
import type { Page } from '../common/pagination/Page';
import type { PageRequest } from '../common/pagination/PageRequest';
import type { NoteDocument, NoteEntity, NoteView } from '../domain/Note';

export interface NewNote {
  user_id: Types.ObjectId;
  title: string;
  content?: string;
  isArchived?: boolean;
  pinned_at?: Date | null;
  category_id?: Types.ObjectId;
  tag_ids?: Types.ObjectId[];
}

export interface NoteChanges {
  title?: string;
  content?: string;
  isArchived?: boolean;
  /** A date pins the note, null unpins it. */
  pinned_at?: Date | null;
  /** null removes the category. */
  category_id?: Types.ObjectId | null;
  tag_ids?: Types.ObjectId[];
}

export interface NoteSearchCriteria {
  /** One user's notes; omitted means every user's notes. */
  userId?: Types.ObjectId;
  /** true: archived notes only; false: non-archived only; undefined: both. */
  isArchived?: boolean;
  categoryId?: Types.ObjectId;
  /** Notes carrying this tag. */
  tagId?: Types.ObjectId;
  /** By created date (_id order). */
  order: 'asc' | 'desc';
}

export interface NoteRepository {
  /**
   * List and filter notes by created date. Index per case:
   * - one user's notes, pinned first: { user_id: 1, pinned_at: -1, _id: -1 }
   * - every user's notes: the _id index
   * The isArchived / category / tag filters are applied to the rows the index returns.
   */
  search(criteria: NoteSearchCriteria, page: PageRequest): Promise<Page<NoteView>>;
  /** _id index; when userId is given the note must also belong to that user. */
  findOne(id: Types.ObjectId, userId?: Types.ObjectId): Promise<NoteView | null>;
  create(note: NewNote): Promise<NoteDocument>;
  /** _id index; the note's fields without populated references (for comparing before / after a change). */
  findOwnedEntity(id: Types.ObjectId, userId: Types.ObjectId): Promise<NoteEntity | null>;
  /** _id index; only the owner's note is updated. Changing only pinned_at / isArchived keeps updatedAt. */
  updateOwned(id: Types.ObjectId, userId: Types.ObjectId, changes: NoteChanges): Promise<NoteDocument | null>;
  /** _id index; returns the deleted note, or null when no note of this user matched. */
  deleteOwned(id: Types.ObjectId, userId: Types.ObjectId): Promise<NoteEntity | null>;
  /** Cascade when a user is removed: { user_id: 1, pinned_at: -1, _id: -1 } (user_id prefix). */
  deleteByUser(userId: Types.ObjectId): Promise<void>;
}
