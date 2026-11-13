import { ArrayMaxSize, IsArray, IsString, Length, MaxLength } from 'class-validator';
import { Distinct, Optional, Trim, TrimLowerCaseEach } from '../decorators';

/** PATCH /api/auth/me. The password has its own endpoint (POST /api/auth/me/password), which checks the current one. */
export class UpdateProfileDto {
  @Optional() @Trim() @IsString() @Length(1, 100)
  name?: string;

  @Optional() @Trim() @IsString() @MaxLength(500)
  bio?: string;

  @Optional() @TrimLowerCaseEach() @Distinct() @IsArray() @ArrayMaxSize(20) @IsString({ each: true }) @Length(1, 50, { each: true })
  interests?: string[];
}
