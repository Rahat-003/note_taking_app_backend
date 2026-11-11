import { injectable } from 'tsyringe';
import { UserCategoryModel } from '../../domain/UserCategory';
import { MongoUserLabelRepository } from './MongoUserLabelRepository';

/** user_categories, indexed by { user_id: 1, category_id: 1 } (unique). */
@injectable()
export class MongoUserCategoryRepository extends MongoUserLabelRepository {
  constructor() {
    super(UserCategoryModel, 'category_id', 'categories');
  }
}
