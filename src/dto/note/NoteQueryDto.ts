import { IsIn, IsString, MaxLength } from 'class-validator';
import { NOTE_SORT_FIELDS, type NoteSortField } from '../../domain/Note';
import { Optional, Trim } from '../decorators';

/** Query string of GET /api/notes (page / limit are read by PageRequest). Empty values count as absent. */
export class NoteQueryDto {
  /** "true": every user's notes (notes.read_all). */
  @Optional() @IsIn(['true', 'false'])
  all?: string;

  /** One user's notes (notes.read_all). */
  @Optional() @IsString()
  user_id?: string;

  /** Search title and content. */
  @Optional() @Trim() @IsString() @MaxLength(200)
  q?: string;

  /** "false" (default): notes that are not archived; "true": the archive; "all": both. */
  @Optional() @IsIn(['true', 'false', 'all'])
  isArchived?: 'true' | 'false' | 'all';

  /** Notes in this category (categories._id). */
  @Optional() @IsString()
  category_id?: string;

  /** Notes carrying this tag (tags._id). */
  @Optional() @IsString()
  tag_id?: string;

  @Optional() @IsIn(NOTE_SORT_FIELDS)
  sort?: NoteSortField;

  @Optional() @IsIn(['asc', 'desc'])
  order?: 'asc' | 'desc';
}
