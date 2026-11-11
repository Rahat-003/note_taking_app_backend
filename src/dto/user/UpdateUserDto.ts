import { ArrayMaxSize, IsArray, IsEmail, IsString, Length, MaxLength } from 'class-validator';
import { Optional, Trim, TrimLowerCaseEach } from '../decorators';

export class UpdateUserDto {
  @Optional() @Trim() @IsString() @Length(1, 100)
  name?: string;

  @Optional() @IsEmail() @MaxLength(254)
  email?: string;

  @Optional() @IsString() @Length(8, 72)
  password?: string;

  @Optional() @IsString()
  role_id?: string;

  @Optional() @TrimLowerCaseEach() @IsArray() @ArrayMaxSize(20) @IsString({ each: true }) @Length(1, 50, { each: true })
  interests?: string[];
}
