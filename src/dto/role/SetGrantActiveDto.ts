import { IsBoolean } from 'class-validator';

/** PATCH /api/roles/:id/permissions/:permission_id */
export class SetGrantActiveDto {
  @IsBoolean()
  isActive!: boolean;
}
