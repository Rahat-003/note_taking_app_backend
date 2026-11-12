import { ArrayMaxSize, IsArray, IsBoolean, IsString, Length, MaxLength } from 'class-validator';
import { Optional, Trim, TrimLowerCaseEach } from '../decorators';

export class CreateNoteDto {
  @Trim() @IsString() @Length(1, 200)
  title!: string;

  @Optional() @IsString() @MaxLength(20000)
  content?: string;

  @Optional() @IsBoolean()
  isArchived?: boolean;

  /** true pins the note (the server records pinned_at), false unpins it. */
  @Optional() @IsBoolean()
  pinned?: boolean;

  /** Foreign key to categories._id (optional). */
  @Optional() @IsString()
  category_id?: string;

  @Optional() @TrimLowerCaseEach() @IsArray() @ArrayMaxSize(20) @IsString({ each: true }) @Length(1, 30, { each: true })
  /** Tag names; tags that do not exist yet are created. */
  tags?: string[];
}
