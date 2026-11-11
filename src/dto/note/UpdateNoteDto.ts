import { ArrayMaxSize, IsArray, IsIn, IsString, Length, MaxLength } from 'class-validator';
import { NOTE_STATUSES, type NoteStatus } from '../../domain/Note';
import { Optional, Trim, TrimLowerCase, TrimLowerCaseEach } from '../decorators';

export class UpdateNoteDto {
  @Optional() @Trim() @IsString() @Length(1, 200)
  title?: string;

  @Optional() @IsString() @MaxLength(20000)
  content?: string;

  @Optional() @IsIn(NOTE_STATUSES)
  status?: NoteStatus;

  /** Optional label; an empty string removes it. */
  @Optional() @TrimLowerCase() @IsString() @MaxLength(50)
  category?: string;

  @Optional() @TrimLowerCaseEach() @IsArray() @ArrayMaxSize(20) @IsString({ each: true }) @Length(1, 30, { each: true })
  tags?: string[];
}
