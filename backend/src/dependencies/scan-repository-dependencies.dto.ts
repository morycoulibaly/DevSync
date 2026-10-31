import { IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class ScanRepositoryDependenciesDto {
  @IsString()
  @IsNotEmpty()
  repositoryId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  @Matches(/^(?!.*(?:^|\/)\.\.?\/)(?:[A-Za-z0-9._@+-]+\/)*package\.json$/)
  packageJsonPath?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  @Matches(/^(?!.*(?:^|\/)\.\.?\/)(?:[A-Za-z0-9._@+-]+\/)*package-lock\.json$/)
  packageLockPath?: string;
}
