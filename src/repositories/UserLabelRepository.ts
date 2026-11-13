import type { Types } from 'mongoose';
import type { Page } from '../common/pagination/Page';
import type { PageRequest } from '../common/pagination/PageRequest';
import type { UserLabel } from '../domain/Label';

/** user_categories / user_tags: the labels a user's notes use, with a note count per label. */
export interface UserLabelRepository {
  /** The user's labels sorted by name: $match on the { user_id, <label>_id } index, $lookup for the names. */
  findByUser(userId: Types.ObjectId, page: PageRequest): Promise<Page<UserLabel>>;
  /** Adds `delta` to the user's note count of each label; a label whose count reaches 0 is removed. */
  adjust(userId: Types.ObjectId, labelIds: readonly Types.ObjectId[], delta: 1 | -1): Promise<void>;
}
