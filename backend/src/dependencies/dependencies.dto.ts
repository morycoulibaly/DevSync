import { IsObject, IsOptional } from 'class-validator';

/** Le MVP accepte un package.json complet collé dans l'interface. */
export class ScanDependenciesDto {
  @IsObject()
  packageJson!: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  packageLock?: Record<string, unknown>;
}
