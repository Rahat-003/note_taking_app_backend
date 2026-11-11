import type { Page } from '../common/pagination/Page';
import type { PageRequest } from '../common/pagination/PageRequest';
import type { NoteDocument, NoteView } from '../domain/Note';
import type { CreateNoteDto } from '../dto/note/CreateNoteDto';
import type { UpdateNoteDto } from '../dto/note/UpdateNoteDto';
import type { Principal } from './Principal';

export interface NoteListQuery {
  /** Everyone's notes (needs notes.read_all). */
  all: boolean;
  /** One user's notes, ?user_id= (needs notes.read_all). */
  user_id?: unknown;
}

export interface NoteService {
  list(principal: Principal, query: NoteListQuery, page: PageRequest): Promise<Page<NoteView>>;
  get(principal: Principal, noteId: string): Promise<NoteView>;
  create(principal: Principal, dto: CreateNoteDto): Promise<NoteDocument>;
  update(principal: Principal, noteId: string, dto: UpdateNoteDto): Promise<NoteDocument>;
  delete(principal: Principal, noteId: string): Promise<void>;
}
