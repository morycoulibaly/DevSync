import { IsString, Matches, MaxLength } from 'class-validator';

export class CreateRepositoryDto {
  @IsString()
  @Matches(/^[A-Za-z0-9_.-]+$/)
  @MaxLength(100)
  owner!: string;

  @IsString()
  @Matches(/^[A-Za-z0-9_.-]+$/)
  @MaxLength(100)
  name!: string;
}
