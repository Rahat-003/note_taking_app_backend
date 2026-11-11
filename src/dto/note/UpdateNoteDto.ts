import { IsString, Length, MaxLength } from 'class-validator';
import { Optional, Trim } from '../decorators';

export class UpdateNoteDto {
  @Optional() @Trim() @IsString() @Length(1, 200)
  title?: string;

  @Optional() @IsString() @MaxLength(20000)
  content?: string;
}
