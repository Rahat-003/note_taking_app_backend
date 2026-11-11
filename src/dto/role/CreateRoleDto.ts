import { ArrayMaxSize, IsArray, IsIn, IsString, Length, Matches, MaxLength } from 'class-validator';
import { PERMISSION_KEYS } from '../../common/PermissionKey';
import { Distinct, Optional, Trim, TrimLowerCase } from '../decorators';

export class CreateRoleDto {
  @TrimLowerCase() @IsString() @Length(1, 50) @Matches(/^[a-z0-9_-]+$/, { message: 'use letters, numbers, - or _' })
  name!: string;

  @Optional() @Trim() @IsString() @MaxLength(200)
  description?: string;

  @Distinct() @IsArray() @ArrayMaxSize(PERMISSION_KEYS.length) @IsIn(PERMISSION_KEYS, { each: true })
  permissions: string[] = [];
}
