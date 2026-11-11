import { injectable } from 'tsyringe';
import { UserTagModel } from '../../domain/UserTag';
import { MongoUserLabelRepository } from './MongoUserLabelRepository';

/** user_tags, indexed by { user_id: 1, tag_id: 1 } (unique). */
@injectable()
export class MongoUserTagRepository extends MongoUserLabelRepository {
  constructor() {
    super(UserTagModel, 'tag_id', 'tags');
  }
}
