import type { Types } from 'mongoose';
import { inject, injectable } from 'tsyringe';
import { BadRequestException } from '../../common/exceptions/BadRequestException';
import { ObjectIds } from '../../common/ObjectIds';
import type { Page } from '../../common/pagination/Page';
import type { PageRequest } from '../../common/pagination/PageRequest';
import { Tokens } from '../../common/Tokens';
import type { CategoryEntity } from '../../domain/Category';
import type { UserLabel } from '../../domain/Label';
import type { CategoryRepository } from '../../repositories/CategoryRepository';
import type { UserLabelRepository } from '../../repositories/UserLabelRepository';
import type { CategoryService } from '../CategoryService';
import type { Principal } from '../Principal';

@injectable()
export class CategoryServiceImpl implements CategoryService {
  constructor(
    @inject(Tokens.CategoryRepository) private readonly categories: CategoryRepository,
    @inject(Tokens.UserCategoryRepository) private readonly userCategories: UserLabelRepository,
  ) {}

  list(page: PageRequest): Promise<Page<CategoryEntity>> {
    return this.categories.findAll(page);
  }

  listMine(principal: Principal, page: PageRequest): Promise<Page<UserLabel>> {
    return this.userCategories.findByUser(principal.id, page);
  }

  create(name: string): Promise<{ category: CategoryEntity; created: boolean }> {
    return this.categories.createIfMissing(name);
  }

  async requireExisting(categoryId: string): Promise<Types.ObjectId> {
    const id = ObjectIds.parse(categoryId);
    if (!(await this.categories.findById(id))) throw new BadRequestException('Category does not exist');
    return id;
  }

  async recordUsage(userId: Types.ObjectId, before: Types.ObjectId | undefined, after: Types.ObjectId | undefined): Promise<void> {
    if (before && after && before.equals(after)) return;
    if (before) await this.userCategories.adjust(userId, [before], -1);
    if (after) await this.userCategories.adjust(userId, [after], 1);
  }
}
