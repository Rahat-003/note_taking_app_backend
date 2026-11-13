import { IsBoolean } from 'class-validator';

/** PATCH /api/users/:id/status. false deactivates the account (the user loses access at once), true restores it. */
export class UserStatusDto {
  @IsBoolean()
  isActive!: boolean;
}
