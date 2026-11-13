import type { Types } from 'mongoose';
import { inject, injectable } from 'tsyringe';
import { ForbiddenException } from '../../common/exceptions/ForbiddenException';
import { NotFoundException } from '../../common/exceptions/NotFoundException';
import { ObjectIds } from '../../common/ObjectIds';
import type { Page } from '../../common/pagination/Page';
import type { PageRequest } from '../../common/pagination/PageRequest';
import { PERMISSION_DESCRIPTIONS, PermissionKey } from '../../common/PermissionKey';
import { Tokens } from '../../common/Tokens';
import type { NoteView } from '../../domain/Note';
import type { CreateNoteDto } from '../../dto/note/CreateNoteDto';
import type { NoteQueryDto } from '../../dto/note/NoteQueryDto';
import type { UpdateNoteDto } from '../../dto/note/UpdateNoteDto';
import type { NoteChanges, NoteRepository } from '../../repositories/NoteRepository';
import type { CategoryService } from '../CategoryService';
import type { TagService } from '../TagService';
import type { NoteService } from '../NoteService';
import type { Principal } from '../Principal';

/**
 * Own notes: notes.manage_own to create, list and view, notes.update_own to change (edit, pin, archive),
 * notes.delete_own to delete. Reading other people's notes needs notes.read_all.
 * Writes are always limited to the owner. Someone else's note is reported as 404, not 403,
 * so the API does not reveal that it exists.
 */
@injectable()
export class NoteServiceImpl implements NoteService {
  constructor(
    @inject(Tokens.NoteRepository) private readonly notes: NoteRepository,
    @inject(Tokens.CategoryService) private readonly categories: CategoryService,
    @inject(Tokens.TagService) private readonly tags: TagService,
  ) {}

  list(principal: Principal, query: NoteQueryDto, page: PageRequest): Promise<Page<NoteView>> {
    const all = query.all === 'true';
    const crossUser = all || Boolean(query.user_id);
    const needed = crossUser ? PermissionKey.NOTES_READ_ALL : PermissionKey.NOTES_MANAGE_OWN;
    if (!principal.can(needed)) throw ForbiddenException.missing(needed, PERMISSION_DESCRIPTIONS.get(needed));
    let userId: Types.ObjectId | undefined = principal.id;
    if (query.user_id) userId = ObjectIds.parse(query.user_id);
    else if (all) userId = undefined;

    return this.notes.search(
      {
        userId,
        // Archived notes stay out of the list unless asked for.
        isArchived: query.isArchived === 'all' ? undefined : query.isArchived === 'true',
        categoryId: query.category_id ? ObjectIds.parse(query.category_id) : undefined,
        tagId: query.tag_id ? ObjectIds.parse(query.tag_id) : undefined,
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

  async create(principal: Principal, dto: CreateNoteDto): Promise<NoteView> {
    const categoryId = dto.category_id ? await this.categories.requireExisting(dto.category_id) : undefined;
    const tagIds = await this.tags.idsForNames(dto.tags ?? []);
    const note = await this.notes.create({
      user_id: principal.id,
      title: dto.title,
      content: dto.content,
      isArchived: dto.isArchived,
      pinned_at: dto.pinned && !dto.isArchived ? new Date() : null,
      category_id: categoryId,
      tag_ids: tagIds,
    });
    await this.categories.recordUsage(principal.id, undefined, categoryId);
    await this.tags.recordUsage(principal.id, [], tagIds);
    return this.view(note._id);
  }

  async update(principal: Principal, noteId: string, dto: UpdateNoteDto): Promise<NoteView> {
    const id = ObjectIds.parse(noteId);
    const before = await this.notes.findOwnedEntity(id, principal.id);
    if (!before) throw new NotFoundException('Note not found');

    const changes: NoteChanges = { title: dto.title, content: dto.content, isArchived: dto.isArchived };
    // Pinning records the time; pinning an already pinned note keeps its place. Unpinning clears it.
    if (dto.pinned !== undefined) changes.pinned_at = dto.pinned ? (before.pinned_at ?? new Date()) : null;
    // Archiving a note unpins it: pins belong to the active list.
    if (dto.isArchived === true) changes.pinned_at = null;
    if (dto.category_id !== undefined) {
      changes.category_id = dto.category_id === '' ? null : await this.categories.requireExisting(dto.category_id);
    }
    if (dto.tags !== undefined) changes.tag_ids = await this.tags.idsForNames(dto.tags);
    for (const key of Object.keys(changes) as Array<keyof NoteChanges>) if (changes[key] === undefined) delete changes[key];

    const after = await this.notes.updateOwned(id, principal.id, changes);
    if (!after) throw new NotFoundException('Note not found');
    await this.categories.recordUsage(principal.id, before.category_id, after.category_id ?? undefined);
    await this.tags.recordUsage(principal.id, before.tag_ids, after.tag_ids);
    return this.view(id);
  }

  async delete(principal: Principal, noteId: string): Promise<void> {
    const deleted = await this.notes.deleteOwned(ObjectIds.parse(noteId), principal.id);
    if (!deleted) throw new NotFoundException('Note not found');
    await this.categories.recordUsage(principal.id, deleted.category_id, undefined);
    await this.tags.recordUsage(principal.id, deleted.tag_ids, []);
  }

  /** The note with its owner, category and tags populated. */
  private async view(id: Types.ObjectId): Promise<NoteView> {
    const note = await this.notes.findOne(id);
    if (!note) throw new NotFoundException('Note not found');
    return note;
  }
}
