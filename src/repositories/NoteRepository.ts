import type { Types } from 'mongoose';
import type { Page } from '../common/pagination/Page';
import type { PageRequest } from '../common/pagination/PageRequest';
import type { NoteDocument, NoteSortField, NoteStatus, NoteView } from '../domain/Note';

export interface NewNote {
  user_id: Types.ObjectId;
  title: string;
  content?: string;
  status?: NoteStatus;
  category?: string;
  tags?: string[];
}

export interface NoteChanges {
  title?: string;
  content?: string;
  status?: NoteStatus;
  /** An empty string removes the category. */
  category?: string;
  tags?: string[];
}

export interface NoteSearchCriteria {
  /** One user's notes; omitted means every user's notes. */
  userId?: Types.ObjectId;
  /** Full-text search on title and content. */
  text?: string;
  status?: NoteStatus;
  category?: string;
  /** Notes carrying this tag. */
  tag?: string;
  sort: NoteSortField;
  order: 'asc' | 'desc';
}

export interface NoteRepository {
  /**
   * Search, filter and sort notes. Index per case:
   * - text: the { title: 'text', content: 'text' } index
   * - one user's notes: { user_id: 1, _id: -1 } (created) or { user_id: 1, updatedAt: -1 } (updated)
   * - every user's notes: the _id index (created) or { updatedAt: -1 } (updated)
   * Filters on status / category / tag are applied to the rows the index returns.
   */
  search(criteria: NoteSearchCriteria, page: PageRequest): Promise<Page<NoteView>>;
  /** _id index; when userId is given the note must also belong to that user. */
  findOne(id: Types.ObjectId, userId?: Types.ObjectId): Promise<NoteView | null>;
  create(note: NewNote): Promise<NoteDocument>;
  /** _id index; only the owner's note is updated. */
  updateOwned(id: Types.ObjectId, userId: Types.ObjectId, changes: NoteChanges): Promise<NoteDocument | null>;
  /** _id index; returns false when no note of this user matched. */
  deleteOwned(id: Types.ObjectId, userId: Types.ObjectId): Promise<boolean>;
  /** { user_id: 1, _id: -1 }. */
  deleteByUser(userId: Types.ObjectId): Promise<void>;
}
