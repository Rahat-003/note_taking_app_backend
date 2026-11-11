import { IsEmail, IsString, Length, MaxLength } from 'class-validator';
import { Trim } from '../decorators';

/** Self-registration takes only these fields; anything else (role, interests, ...) is stripped. */
export class RegisterDto {
  @Trim() @IsString() @Length(1, 100)
  name!: string;

  @IsEmail() @MaxLength(254)
  email!: string;

  @IsString() @Length(8, 72)
  password!: string;
}
