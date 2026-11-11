import type { Types } from 'mongoose';
import { inject, injectable } from 'tsyringe';
import { ForbiddenException } from '../../common/exceptions/ForbiddenException';
import { NotFoundException } from '../../common/exceptions/NotFoundException';
import { ObjectIds } from '../../common/ObjectIds';
import type { Page } from '../../common/pagination/Page';
import type { PageRequest } from '../../common/pagination/PageRequest';
import { PermissionKey } from '../../common/PermissionKey';
import { Tokens } from '../../common/Tokens';
import type { NoteDocument, NoteView } from '../../domain/Note';
import type { CreateNoteDto } from '../../dto/note/CreateNoteDto';
import type { NoteQueryDto } from '../../dto/note/NoteQueryDto';
import type { UpdateNoteDto } from '../../dto/note/UpdateNoteDto';
import type { NoteRepository } from '../../repositories/NoteRepository';
import type { NoteService } from '../NoteService';
import type { Principal } from '../Principal';

/**
 * Own notes need notes.manage_own; reading other people's notes needs notes.read_all.
 * Writes are always limited to the owner. Someone else's note is reported as 404, not 403,
 * so the API does not reveal that it exists.
 */
@injectable()
export class NoteServiceImpl implements NoteService {
  constructor(@inject(Tokens.NoteRepository) private readonly notes: NoteRepository) {}

  list(principal: Principal, query: NoteQueryDto, page: PageRequest): Promise<Page<NoteView>> {
    const all = query.all === 'true';
    const crossUser = all || Boolean(query.user_id);
    if (!principal.can(crossUser ? PermissionKey.NOTES_READ_ALL : PermissionKey.NOTES_MANAGE_OWN)) {
      throw new ForbiddenException();
    }
    let userId: Types.ObjectId | undefined = principal.id;
    if (query.user_id) userId = ObjectIds.parse(query.user_id);
    else if (all) userId = undefined;

    return this.notes.search(
      {
        userId,
        text: query.q,
        status: query.status,
        category: query.category,
        tag: query.tag,
        sort: query.sort ?? 'createdAt',
        order: query.order ?? 'desc',
      },
      page,
    );
  }

  async get(principal: Principal, noteId: string): Promise<NoteView> {
    const userId = principal.can(PermissionKey.NOTES_READ_ALL) ? undefined : principal.id;
    const note = await this.notes.findOne(ObjectIds.parse(noteId), userId);
    if (!note) throw new NotFoundException('Note not found');
    return note;
  }

  create(principal: Principal, dto: CreateNoteDto): Promise<NoteDocument> {
    return this.notes.create({
      user_id: principal.id,
      title: dto.title,
      content: dto.content,
      status: dto.status,
      category: dto.category || undefined,
      tags: dto.tags && [...new Set(dto.tags)],
    });
  }

  async update(principal: Principal, noteId: string, dto: UpdateNoteDto): Promise<NoteDocument> {
    const changes = { ...dto, ...(dto.tags && { tags: [...new Set(dto.tags)] }) };
    const note = await this.notes.updateOwned(ObjectIds.parse(noteId), principal.id, changes);
    if (!note) throw new NotFoundException('Note not found');
    return note;
  }

  async delete(principal: Principal, noteId: string): Promise<void> {
    if (!(await this.notes.deleteOwned(ObjectIds.parse(noteId), principal.id))) {
      throw new NotFoundException('Note not found');
    }
  }
}
