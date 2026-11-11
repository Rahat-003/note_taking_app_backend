import { ArrayMaxSize, IsArray, IsEmail, IsString, Length, MaxLength } from 'class-validator';
import { Optional, Trim, TrimLowerCaseEach } from '../decorators';

export class CreateUserDto {
  @Trim() @IsString() @Length(1, 100)
  name!: string;

  @IsEmail() @MaxLength(254)
  email!: string;

  @IsString() @Length(8, 72)
  password!: string;

  /** Foreign key to roles._id; defaults to the "user" role. */
  @Optional() @IsString()
  role_id?: string;

  @Optional() @TrimLowerCaseEach() @IsArray() @ArrayMaxSize(20) @IsString({ each: true }) @Length(1, 50, { each: true })
  interests?: string[];
}
