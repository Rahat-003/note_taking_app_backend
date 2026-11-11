import type { Types } from 'mongoose';
import { injectable } from 'tsyringe';
import { Page } from '../../common/pagination/Page';
import { PageRequest } from '../../common/pagination/PageRequest';
import { type CategoryEntity, CategoryModel } from '../../domain/Category';
import type { CategoryRepository } from '../CategoryRepository';

@injectable()
export class MongoCategoryRepository implements CategoryRepository {
  async findAll(page: PageRequest): Promise<Page<CategoryEntity>> {
    const [data, total] = await Promise.all([
      CategoryModel.find().sort({ name: 1 }).skip(page.skip).limit(page.limit).lean<CategoryEntity[]>().exec(),
      CategoryModel.estimatedDocumentCount().exec(),
    ]);
    return Page.of(data, total, page);
  }

  findById(id: Types.ObjectId): Promise<CategoryEntity | null> {
    return CategoryModel.findById(id).lean<CategoryEntity>().exec();
  }

  async createIfMissing(name: string): Promise<{ category: CategoryEntity; created: boolean }> {
    const res = await CategoryModel.updateOne({ name }, { $setOnInsert: { name } }, { upsert: true }).exec();
    const category = await CategoryModel.findOne({ name }).lean<CategoryEntity>().orFail().exec();
    return { category, created: res.upsertedCount === 1 };
  }
}
