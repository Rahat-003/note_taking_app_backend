import type { Types } from 'mongoose';
import type { Page } from '../common/pagination/Page';
import type { PageRequest } from '../common/pagination/PageRequest';
import type { NoteDocument, NoteEntity, NoteSortField, NoteView } from '../domain/Note';

export interface NewNote {
  user_id: Types.ObjectId;
  title: string;
  content?: string;
  isArchived?: boolean;
  category_id?: Types.ObjectId;
  tag_ids?: Types.ObjectId[];
}

export interface NoteChanges {
  title?: string;
  content?: string;
  isArchived?: boolean;
  /** null removes the category. */
  category_id?: Types.ObjectId | null;
  tag_ids?: Types.ObjectId[];
}

export interface NoteSearchCriteria {
  /** One user's notes; omitted means every user's notes. */
  userId?: Types.ObjectId;
  /** Full-text search on title and content. */
  text?: string;
  /** true: archived notes only; false: non-archived only; undefined: both. */
  isArchived?: boolean;
  categoryId?: Types.ObjectId;
  /** Notes carrying this tag. */
  tagId?: Types.ObjectId;
  sort: NoteSortField;
  order: 'asc' | 'desc';
}

export interface NoteRepository {
  /**
   * Search, filter and sort notes. Index per case:
   * - text: the { title: 'text', content: 'text' } index
   * - one user's notes: { user_id: 1, _id: -1 } (created) or { user_id: 1, updatedAt: -1 } (updated);
   *   in one category / with one tag: { user_id: 1, category_id: 1, _id: -1 } / { user_id: 1, tag_ids: 1, _id: -1 }
   * - every user's notes: the _id index (created) or { updatedAt: -1 } (updated)
   * The isArchived filter is applied to the rows the index returns.
   */
  search(criteria: NoteSearchCriteria, page: PageRequest): Promise<Page<NoteView>>;
  /** _id index; when userId is given the note must also belong to that user. */
  findOne(id: Types.ObjectId, userId?: Types.ObjectId): Promise<NoteView | null>;
  create(note: NewNote): Promise<NoteDocument>;
  /** _id index; the note's fields without populated references (for comparing before / after a change). */
  findOwnedEntity(id: Types.ObjectId, userId: Types.ObjectId): Promise<NoteEntity | null>;
  /** _id index; only the owner's note is updated. */
  updateOwned(id: Types.ObjectId, userId: Types.ObjectId, changes: NoteChanges): Promise<NoteDocument | null>;
  /** _id index; returns the deleted note, or null when no note of this user matched. */
  deleteOwned(id: Types.ObjectId, userId: Types.ObjectId): Promise<NoteEntity | null>;
  /** { user_id: 1, _id: -1 }. */
  deleteByUser(userId: Types.ObjectId): Promise<void>;
}
