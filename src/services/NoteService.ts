import type { Page } from '../common/pagination/Page';
import type { PageRequest } from '../common/pagination/PageRequest';
import type { NoteView } from '../domain/Note';
import type { CreateNoteDto } from '../dto/note/CreateNoteDto';
import type { NoteQueryDto } from '../dto/note/NoteQueryDto';
import type { UpdateNoteDto } from '../dto/note/UpdateNoteDto';
import type { Principal } from './Principal';


export interface NoteService {
  /** Own notes, or one user's / everyone's (notes.read_all); with search, filters and sorting. */
  list(principal: Principal, query: NoteQueryDto, page: PageRequest): Promise<Page<NoteView>>;
  get(principal: Principal, noteId: string): Promise<NoteView>;
  create(principal: Principal, dto: CreateNoteDto): Promise<NoteView>;
  update(principal: Principal, noteId: string, dto: UpdateNoteDto): Promise<NoteView>;
  delete(principal: Principal, noteId: string): Promise<void>;
}
