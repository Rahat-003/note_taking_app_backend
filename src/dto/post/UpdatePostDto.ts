import { IsString, Length } from 'class-validator';
import { Optional, Trim } from '../decorators';

/** PATCH /api/posts/:id: the fields to change (unknown fields are rejected). */
export class UpdatePostDto {
  @Optional() @Trim() @IsString() @Length(1, 200)
  title?: string;

  @Optional() @Trim() @IsString() @Length(1, 20000)
  body?: string;
}
