import { IsIn, IsString } from 'class-validator';
import { Optional } from '../decorators';

/** Query string of GET /api/notes (page / limit are read by PageRequest). Empty values count as absent. */
export class NoteQueryDto {
  /** "true": every user's notes (notes.read_all). */
  @Optional() @IsIn(['true', 'false'])
  all?: string;

  /** One user's notes (notes.read_all). */
  @Optional() @IsString()
  user_id?: string;

  /** "false" (default): notes that are not archived; "true": the archive; "all": both. */
  @Optional() @IsIn(['true', 'false', 'all'])
  isArchived?: 'true' | 'false' | 'all';

  /** Notes in this category (categories._id). */
  @Optional() @IsString()
  category_id?: string;

  /** Notes carrying this tag (tags._id). */
  @Optional() @IsString()
  tag_id?: string;

  /** By created date: "desc" (default, newest first) or "asc". */
  @Optional() @IsIn(['asc', 'desc'])
  order?: 'asc' | 'desc';
}
