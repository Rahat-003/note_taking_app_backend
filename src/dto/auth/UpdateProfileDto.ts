import { ArrayMaxSize, IsArray, IsString, Length } from 'class-validator';
import { Optional, Trim, TrimLowerCaseEach } from '../decorators';

export class UpdateProfileDto {
  @Optional() @Trim() @IsString() @Length(1, 100)
  name?: string;

  @Optional() @TrimLowerCaseEach() @IsArray() @ArrayMaxSize(20) @IsString({ each: true }) @Length(1, 50, { each: true })
  interests?: string[];

  @Optional() @IsString() @Length(8, 72)
  password?: string;
}
