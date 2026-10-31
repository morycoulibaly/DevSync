import { IsDateString, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class GenerateDigestDto {
  @IsString()
  @IsNotEmpty()
  repositoryId!: string;

  @IsOptional()
  @IsDateString()
  date?: string;
}
