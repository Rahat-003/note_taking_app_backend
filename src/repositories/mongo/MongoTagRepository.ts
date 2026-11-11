import { injectable } from 'tsyringe';
import { Page } from '../../common/pagination/Page';
import { PageRequest } from '../../common/pagination/PageRequest';
import { type TagEntity, TagModel } from '../../domain/Tag';
import type { TagRepository } from '../TagRepository';

@injectable()
export class MongoTagRepository implements TagRepository {
  async findAll(page: PageRequest): Promise<Page<TagEntity>> {
    const [data, total] = await Promise.all([
      TagModel.find().sort({ name: 1 }).skip(page.skip).limit(page.limit).lean<TagEntity[]>().exec(),
      TagModel.estimatedDocumentCount().exec(),
    ]);
    return Page.of(data, total, page);
  }

  async findOrCreateByNames(names: readonly string[]): Promise<TagEntity[]> {
    if (!names.length) return [];
    await TagModel.bulkWrite(
      names.map((name) => ({ updateOne: { filter: { name }, update: { $setOnInsert: { name } }, upsert: true } })),
      { timestamps: true },
    );
    const tags = await TagModel.find({ name: { $in: [...names] } }).lean<TagEntity[]>().exec();
    return names.map((name) => tags.find((t) => t.name === name)!).filter(Boolean);
  }
}
