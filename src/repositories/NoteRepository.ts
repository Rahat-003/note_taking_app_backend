import type { Types } from 'mongoose';
import type { Page } from '../common/pagination/Page';
import type { PageRequest } from '../common/pagination/PageRequest';
import type { NoteDocument, NoteView } from '../domain/Note';

export interface NewNote {
  user_id: Types.ObjectId;
  title: string;
  content?: string;
}

export interface NoteChanges {
  title?: string;
  content?: string;
}

export interface NoteRepository {
  /** { user_id: 1, _id: -1 } for the page and for countDocuments({ user_id }). */
  findByUser(userId: Types.ObjectId, page: PageRequest): Promise<Page<NoteView>>;
  /** Newest first via the _id index; total from collection metadata. */
  findAll(page: PageRequest): Promise<Page<NoteView>>;
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
