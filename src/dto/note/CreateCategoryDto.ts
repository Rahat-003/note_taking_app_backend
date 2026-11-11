import { IsString, Length } from 'class-validator';
import { TrimLowerCase } from '../decorators';

/** POST /api/categories */
export class CreateCategoryDto {
  @TrimLowerCase() @IsString() @Length(1, 50)
  name!: string;
}
