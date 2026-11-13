import { IsString, Length, MinLength } from 'class-validator';

/** POST /api/auth/me/password. confirmPassword must repeat newPassword (checked by the service). */
export class ChangePasswordDto {
  @IsString() @MinLength(1, { message: 'is required' })
  currentPassword!: string;

  @IsString() @Length(8, 72)
  newPassword!: string;

  @IsString() @MinLength(1, { message: 'is required' })
  confirmPassword!: string;
}
