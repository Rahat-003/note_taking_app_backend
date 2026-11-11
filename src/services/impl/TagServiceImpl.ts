import type { Types } from 'mongoose';
import { inject, injectable } from 'tsyringe';
import type { Page } from '../../common/pagination/Page';
import type { PageRequest } from '../../common/pagination/PageRequest';
import { Tokens } from '../../common/Tokens';
import type { UserLabel } from '../../domain/Label';
import type { TagEntity } from '../../domain/Tag';
import type { TagRepository } from '../../repositories/TagRepository';
import type { UserLabelRepository } from '../../repositories/UserLabelRepository';
import type { Principal } from '../Principal';
import type { TagService } from '../TagService';

@injectable()
export class TagServiceImpl implements TagService {
  constructor(
    @inject(Tokens.TagRepository) private readonly tags: TagRepository,
    @inject(Tokens.UserTagRepository) private readonly userTags: UserLabelRepository,
  ) {}

  list(page: PageRequest): Promise<Page<TagEntity>> {
    return this.tags.findAll(page);
  }

  listMine(principal: Principal, page: PageRequest): Promise<Page<UserLabel>> {
    return this.userTags.findByUser(principal.id, page);
  }

  async idsForNames(names: readonly string[]): Promise<Types.ObjectId[]> {
    return (await this.tags.findOrCreateByNames([...new Set(names)])).map((t) => t._id);
  }

  async recordUsage(userId: Types.ObjectId, before: readonly Types.ObjectId[], after: readonly Types.ObjectId[]): Promise<void> {
    const has = (list: readonly Types.ObjectId[], id: Types.ObjectId) => list.some((x) => x.equals(id));
    await this.userTags.adjust(userId, before.filter((id) => !has(after, id)), -1);
    await this.userTags.adjust(userId, after.filter((id) => !has(before, id)), 1);
  }
}
