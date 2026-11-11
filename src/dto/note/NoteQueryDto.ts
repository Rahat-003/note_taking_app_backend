import { IsIn, IsString, MaxLength } from 'class-validator';
import { NOTE_SORT_FIELDS, NOTE_STATUSES, type NoteSortField, type NoteStatus } from '../../domain/Note';
import { Optional, Trim, TrimLowerCase } from '../decorators';

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

  @Optional() @IsIn(NOTE_STATUSES)
  status?: NoteStatus;

  @Optional() @TrimLowerCase() @IsString() @MaxLength(50)
  category?: string;

  @Optional() @TrimLowerCase() @IsString() @MaxLength(30)
  tag?: string;

  @Optional() @IsIn(NOTE_SORT_FIELDS)
  sort?: NoteSortField;

  @Optional() @IsIn(['asc', 'desc'])
  order?: 'asc' | 'desc';
}
