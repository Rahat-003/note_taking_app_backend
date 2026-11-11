import type { Types } from 'mongoose';
import type { Page } from '../common/pagination/Page';
import type { PageRequest } from '../common/pagination/PageRequest';
import type { NoteDocument, NoteView } from '../domain/Note';

export interface NewNote {
  owner: Types.ObjectId;
  title: string;
  content?: string;
}

export interface NoteChanges {
  title?: string;
  content?: string;
}

export interface NoteRepository {
  /** { owner: 1, _id: -1 } for the page and for countDocuments({ owner }). */
  findByOwner(ownerId: Types.ObjectId, page: PageRequest): Promise<Page<NoteView>>;
  /** Newest first via the _id index; total from collection metadata. */
  findAll(page: PageRequest): Promise<Page<NoteView>>;
  /** _id index; when owner is given the note must also belong to them. */
  findOne(id: Types.ObjectId, owner?: Types.ObjectId): Promise<NoteView | null>;
  create(note: NewNote): Promise<NoteDocument>;
  /** _id index; only the owner's note is updated. */
  updateOwned(id: Types.ObjectId, owner: Types.ObjectId, changes: NoteChanges): Promise<NoteDocument | null>;
  /** _id index; returns false when no note of this owner matched. */
  deleteOwned(id: Types.ObjectId, owner: Types.ObjectId): Promise<boolean>;
  /** { owner: 1, _id: -1 }. */
  deleteByOwner(ownerId: Types.ObjectId): Promise<void>;
}
