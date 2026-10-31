import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Prisma, ScanSource, Severity } from '../../generated/prisma';
import { PrismaService } from '../database/prisma.service';

interface SemverTools {
  valid(version: string): string | null;
  validRange(range: string): string | null;
  minVersion(range: string): { version: string } | null;
  lt(version: string, otherVersion: string): boolean;
  satisfies(version: string, range: string): boolean;
}

const semver = require('semver') as SemverTools;

const MAX_DEPENDENCIES_PER_SCAN = 200;
const EXTERNAL_REQUEST_TIMEOUT_MS = 10_000;
const GITHUB_API_VERSION = '2022-11-28';

interface PackageVersionMetadata {
  'dist-tags'?: { latest?: string };
}

interface OsvVulnerability {
  id: string;
  affected?: Array<{
    package?: { name?: string; ecosystem?: string };
    ranges?: Array<{ events?: Array<{ fixed?: string }> }>;
    ecosystem_specific?: { severity?: string };
    database_specific?: { severity?: string };
  }>;
  database_specific?: { severity?: string };
}

interface OsvBatchResponse {
  results?: Array<{ vulns?: Array<{ id: string }> }>;
}

interface DependencyInput {
  name: string;
  range: string;
  installedVersion: string | null;
}

interface DependencyCheck {
  name: string;
  range: string;
  installedVersion: string | null;
  latestVersion: string | null;
  isOutdated: boolean;
  vulnerabilities: OsvVulnerability[];
}

@Injectable()
export class DependenciesService {
  constructor(private readonly prisma: PrismaService) {}

  async scanPackageJson(
    userId: string,
    packageJson: Record<string, unknown>,
    packageLock?: Record<string, unknown>,
  ) {
    return this.saveScan(userId, packageJson, ScanSource.PASTED, undefined, packageLock);
  }

  async scanRepositoryPackageJson(
    userId: string,
    repositoryId: string,
    packageJsonPath = 'package.json',
    packageLockPath?: string,
  ) {
    const repository = await this.getOwnedRepository(userId, repositoryId);

    const packageJson = await this.getRepositoryPackageJson(
      repository.owner,
      repository.name,
      packageJsonPath,
    );
    const lockPath = packageLockPath ?? packageJsonPath.replace(/(^|\/)package\.json$/, '$1package-lock.json');
    const packageLock = await this.getRepositoryPackageLock(
      repository.owner,
      repository.name,
      lockPath,
    );
    return this.saveScan(userId, packageJson, ScanSource.REPOSITORY, repository.id, packageLock ?? undefined);
  }

  async validateRepositoryAccess(userId: string, repositoryId: string) {
    await this.getOwnedRepository(userId, repositoryId);
  }

  private async getOwnedRepository(userId: string, repositoryId: string) {
    const repository = await this.prisma.repository.findFirst({
      where: { id: repositoryId, userId, isActive: true },
      select: { id: true, owner: true, name: true },
    });
    if (!repository) throw new NotFoundException('Dépôt suivi introuvable.');
    return repository;
  }

  private async saveScan(
    userId: string,
    packageJson: Record<string, unknown>,
    source: ScanSource,
    repositoryId?: string,
    packageLock?: Record<string, unknown>,
  ) {
    const dependencies = readDependencies(packageJson, packageLock);
    if (dependencies.length === 0) {
      throw new BadRequestException(
        'Aucune dépendance trouvée dans dependencies, devDependencies, optionalDependencies ou peerDependencies.',
      );
    }
    if (dependencies.length > MAX_DEPENDENCIES_PER_SCAN) {
      throw new BadRequestException(
        `Un scan est limité à ${MAX_DEPENDENCIES_PER_SCAN} dépendances.`,
      );
    }

    const checks = await this.checkDependencies(dependencies);
    const scan = await this.prisma.dependencyScan.create({
      data: {
        userId,
        ...(repositoryId ? { repositoryId } : {}),
        source,
        packageJson: packageJson as Prisma.InputJsonValue,
        findings: {
          create: checks.flatMap((check): Prisma.DependencyFindingCreateWithoutScanInput[] => {
            const findings = check.vulnerabilities.length > 0
              ? check.vulnerabilities.map((vulnerability) => ({
                  packageName: check.name,
                  currentRange: check.range,
                  installedVersion: check.installedVersion,
                  latestVersion: check.latestVersion,
                  isOutdated: check.isOutdated,
                  severity: highestSeverity([vulnerability]),
                  advisoryId: vulnerability.id,
                  advisoryUrl: `https://osv.dev/vulnerability/${encodeURIComponent(vulnerability.id)}`,
                  fixedVersion: findFixedVersion(vulnerability, check.name),
                }))
              : [{
                  packageName: check.name,
                  currentRange: check.range,
                  installedVersion: check.installedVersion,
                  latestVersion: check.latestVersion,
                  isOutdated: check.isOutdated,
                  severity: null,
                  advisoryId: null,
                  advisoryUrl: null,
                  fixedVersion: null,
                }];
            return findings;
          }),
        },
      },
      select: {
        id: true,
        source: true,
        repository: { select: { fullName: true } },
        createdAt: true,
        findings: {
          orderBy: { packageName: 'asc' },
          select: {
            id: true,
            packageName: true,
            currentRange: true,
            installedVersion: true,
            latestVersion: true,
            isOutdated: true,
            severity: true,
            advisoryId: true,
            advisoryUrl: true,
            fixedVersion: true,
          },
        },
      },
    });

    return scan;
  }

  private async getRepositoryPackageJson(
    owner: string,
    repositoryName: string,
    packageJsonPath: string,
  ): Promise<Record<string, unknown>> {
    const encodedPath = packageJsonPath.split('/').map(encodeURIComponent).join('/');
    const fileUrl = new URL(
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repositoryName)}/contents/${encodedPath}`,
      'https://api.github.com',
    );
    let response: Response;
    try {
      response = await fetch(fileUrl, {
        headers: {
          accept: 'application/vnd.github.raw+json',
          'X-GitHub-Api-Version': GITHUB_API_VERSION,
          'User-Agent': 'DevSync-Dependency-Scanner',
        },
        signal: AbortSignal.timeout(EXTERNAL_REQUEST_TIMEOUT_MS),
      });
    } catch {
      throw new ServiceUnavailableException(
        'GitHub ne répond pas. Réessaie la lecture du package.json dans quelques instants.',
      );
    }

    if (response.status === 404) {
      throw new NotFoundException(
        `Aucun fichier ${packageJsonPath} accessible. Vérifie que le dépôt est public et que le fichier existe.`,
      );
    }
    if (response.status === 403) {
      throw new ServiceUnavailableException(
        'GitHub a refusé la lecture. Le dépôt doit être public et la limite de requêtes GitHub peut être atteinte.',
      );
    }
    if (!response.ok) {
      throw new ServiceUnavailableException(
        'Impossible de lire le package.json depuis GitHub pour le moment.',
      );
    }

    let packageJson: unknown;
    try {
      packageJson = JSON.parse(await response.text());
    } catch {
      throw new BadRequestException('Le package.json du dépôt contient un JSON invalide.');
    }
    if (typeof packageJson !== 'object' || packageJson === null || Array.isArray(packageJson)) {
      throw new BadRequestException('Le package.json du dépôt doit être un objet JSON.');
    }
    return packageJson as Record<string, unknown>;
  }

  private async getRepositoryPackageLock(
    owner: string,
    repositoryName: string,
    packageLockPath: string,
  ): Promise<Record<string, unknown> | null> {
    const encodedPath = packageLockPath.split('/').map(encodeURIComponent).join('/');
    const fileUrl = new URL(
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repositoryName)}/contents/${encodedPath}`,
      'https://api.github.com',
    );
    let response: Response;
    try {
      response = await fetch(fileUrl, {
        headers: {
          accept: 'application/vnd.github.raw+json',
          'X-GitHub-Api-Version': GITHUB_API_VERSION,
          'User-Agent': 'DevSync-Dependency-Scanner',
        },
        signal: AbortSignal.timeout(EXTERNAL_REQUEST_TIMEOUT_MS),
      });
    } catch {
      throw new ServiceUnavailableException('GitHub ne répond pas. Réessaie le scan dans quelques instants.');
    }
    // Un dépôt peut ne pas utiliser npm ou ne pas avoir de lockfile.
    if (response.status === 404) return null;
    if (response.status === 403) {
      throw new ServiceUnavailableException('GitHub a refusé la lecture. La limite de requêtes GitHub peut être atteinte.');
    }
    if (!response.ok) {
      throw new ServiceUnavailableException('Impossible de lire le package-lock.json depuis GitHub pour le moment.');
    }
    let packageLock: unknown;
    try {
      packageLock = JSON.parse(await response.text());
    } catch {
      throw new BadRequestException('Le package-lock.json du dépôt contient un JSON invalide.');
    }
    if (typeof packageLock !== 'object' || packageLock === null || Array.isArray(packageLock)) {
      throw new BadRequestException('Le package-lock.json du dépôt doit être un objet JSON.');
    }
    return packageLock as Record<string, unknown>;
  }

  async listForUser(userId: string) {
    return this.prisma.dependencyScan.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true,
        source: true,
        repository: { select: { fullName: true } },
        createdAt: true,
        findings: {
          orderBy: { packageName: 'asc' },
          select: {
            id: true,
            packageName: true,
            currentRange: true,
            installedVersion: true,
            latestVersion: true,
            isOutdated: true,
            severity: true,
            advisoryId: true,
            advisoryUrl: true,
            fixedVersion: true,
          },
        },
      },
    });
  }

  private async checkDependencies(dependencies: DependencyInput[]) {
    const packageResults: Array<{
      dependency: DependencyInput;
      latestVersion: string | null;
    }> = [];
    for (const batch of splitIntoBatches(dependencies, 10)) {
      packageResults.push(...await Promise.all(batch.map(async (dependency) => ({
        dependency,
        latestVersion: await this.getLatestVersion(dependency.name),
      }))));
    }

    const versionedDependencies = packageResults.map(({ dependency }) => ({
      ...dependency,
      checkedVersion: getVersionToCheck(dependency.range, dependency.installedVersion),
    }));
    const queries = versionedDependencies
      .filter((dependency) => dependency.checkedVersion !== null)
      .map((dependency) => ({
        package: { name: dependency.name, ecosystem: 'npm' },
        version: dependency.checkedVersion!,
      }));
    const vulnerabilities = await this.findVulnerabilities(queries);
    let vulnerabilityIndex = 0;

    return packageResults.map(({ dependency, latestVersion }, index) => {
      const versionedDependency = versionedDependencies[index];
      const checkedVulnerabilities = versionedDependency.checkedVersion
        ? vulnerabilities[vulnerabilityIndex++] ?? []
        : [];
      const validRange = semver.validRange(dependency.range);
      const isOutdated = latestVersion !== null
        ? dependency.installedVersion !== null
          ? semver.lt(dependency.installedVersion, latestVersion)
          : validRange !== null && !semver.satisfies(latestVersion, validRange)
        : false;

      return {
        ...dependency,
        latestVersion,
        isOutdated,
        vulnerabilities: checkedVulnerabilities,
      } satisfies DependencyCheck;
    });
  }

  private async getLatestVersion(packageName: string): Promise<string | null> {
    const packageUrl = `https://registry.npmjs.org/${encodeURIComponent(packageName)}`;
    let response: Response;
    try {
      response = await fetch(packageUrl, {
        headers: { accept: 'application/vnd.npm.install-v1+json' },
        signal: AbortSignal.timeout(EXTERNAL_REQUEST_TIMEOUT_MS),
      });
    } catch {
      throw new ServiceUnavailableException(
        'Le registre npm ne répond pas. Réessaie le scan dans quelques instants.',
      );
    }

    if (response.status === 404) return null;
    if (!response.ok) {
      throw new ServiceUnavailableException(
        'Le registre npm ne répond pas. Réessaie le scan dans quelques instants.',
      );
    }

    const metadata = (await response.json()) as PackageVersionMetadata;
    return metadata['dist-tags']?.latest ?? null;
  }

  private async findVulnerabilities(
    queries: Array<{ package: { name: string; ecosystem: string }; version: string }>,
  ) {
    if (queries.length === 0) return [];

    let response: Response;
    try {
      response = await fetch('https://api.osv.dev/v1/querybatch', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ queries }),
        signal: AbortSignal.timeout(EXTERNAL_REQUEST_TIMEOUT_MS),
      });
    } catch {
      throw new ServiceUnavailableException(
        'La base OSV des vulnérabilités ne répond pas. Réessaie le scan dans quelques instants.',
      );
    }
    if (!response.ok) {
      throw new ServiceUnavailableException(
        'La base OSV des vulnérabilités ne répond pas. Réessaie le scan dans quelques instants.',
      );
    }

    const result = (await response.json()) as OsvBatchResponse;
    const idsByQuery = queries.map((_, index) =>
      result.results?.[index]?.vulns?.map(({ id }) => id) ?? [],
    );
    const uniqueIds = [...new Set(idsByQuery.flat())];
    const details = new Map<string, OsvVulnerability>();

    for (const batch of splitIntoBatches(uniqueIds, 10)) {
      const batchDetails = await Promise.all(batch.map((id) => this.getVulnerability(id)));
      for (const vulnerability of batchDetails) {
        if (vulnerability) details.set(vulnerability.id, vulnerability);
      }
    }

    return idsByQuery.map((ids) => ids.flatMap((id) => {
      const vulnerability = details.get(id);
      return vulnerability ? [vulnerability] : [];
    }));
  }

  private async getVulnerability(id: string): Promise<OsvVulnerability | null> {
    let response: Response;
    try {
      response = await fetch(
        `https://api.osv.dev/v1/vulns/${encodeURIComponent(id)}`,
        { signal: AbortSignal.timeout(EXTERNAL_REQUEST_TIMEOUT_MS) },
      );
    } catch {
      throw new ServiceUnavailableException(
        'Le détail des avis OSV ne répond pas. Réessaie le scan dans quelques instants.',
      );
    }
    if (response.status === 404) return null;
    if (!response.ok) {
      throw new ServiceUnavailableException(
        'Le détail des avis OSV ne répond pas. Réessaie le scan dans quelques instants.',
      );
    }
    return (await response.json()) as OsvVulnerability;
  }
}

function readDependencies(
  packageJson: Record<string, unknown>,
  packageLock?: Record<string, unknown>,
): DependencyInput[] {
  const sections = [
    'dependencies',
    'devDependencies',
    'optionalDependencies',
    'peerDependencies',
  ] as const;
  const dependencies = new Map<string, string>();

  for (const section of sections) {
    const value = packageJson[section];
    if (value === undefined) continue;
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      throw new BadRequestException(`La section ${section} doit être un objet JSON.`);
    }

    for (const [name, versionRange] of Object.entries(value)) {
      if (typeof versionRange !== 'string') {
        throw new BadRequestException(`La version déclarée pour ${name} doit être du texte.`);
      }
      const normalizedRange = versionRange.trim();
      if (!semver.validRange(normalizedRange)) {
        throw new BadRequestException(
          `La plage de version de ${name} (« ${normalizedRange} ») n’est pas une plage npm semver prise en charge.`,
        );
      }
      dependencies.set(name, normalizedRange);
    }
  }

  const installedVersions = readInstalledVersions(packageLock);
  return [...dependencies.entries()].map(([name, range]) => ({
    name,
    range,
    installedVersion: installedVersions.get(name) ?? null,
  }));
}

function readInstalledVersions(packageLock?: Record<string, unknown>): Map<string, string> {
  const versions = new Map<string, string>();
  if (!packageLock) return versions;

  // package-lock v2/v3 enregistre chaque paquet avec son chemin node_modules.
  const packages = packageLock.packages;
  if (typeof packages === 'object' && packages !== null && !Array.isArray(packages)) {
    for (const [path, value] of Object.entries(packages)) {
      if (!path.startsWith('node_modules/') || typeof value !== 'object' || value === null) continue;
      const name = path.slice('node_modules/'.length);
      if (name.includes('/node_modules/')) continue; // On privilégie la dépendance installée à la racine.
      const version = (value as { version?: unknown }).version;
      if (typeof version === 'string' && semver.valid(version)) versions.set(name, version);
    }
  }

  // Compatibilité package-lock v1, dont les paquets directs sont sous "dependencies".
  const lockedDependencies = packageLock.dependencies;
  if (typeof lockedDependencies === 'object' && lockedDependencies !== null && !Array.isArray(lockedDependencies)) {
    for (const [name, value] of Object.entries(lockedDependencies)) {
      if (versions.has(name) || typeof value !== 'object' || value === null) continue;
      const version = (value as { version?: unknown }).version;
      if (typeof version === 'string' && semver.valid(version)) versions.set(name, version);
    }
  }
  return versions;
}

function getVersionToCheck(range: string, installedVersion: string | null): string | null {
  if (installedVersion) return installedVersion;
  const minimum = semver.minVersion(range);
  return minimum?.version ?? null;
}

function splitIntoBatches<T>(items: T[], batchSize: number): T[][] {
  const batches: T[][] = [];
  for (let index = 0; index < items.length; index += batchSize) {
    batches.push(items.slice(index, index + batchSize));
  }
  return batches;
}

function findFixedVersion(vulnerability: OsvVulnerability, packageName: string) {
  const affectedPackage = vulnerability.affected?.find(
    (affected) => affected.package?.name === packageName && affected.package.ecosystem === 'npm',
  );
  return affectedPackage?.ranges
    ?.flatMap((range) => range.events ?? [])
    .find((event) => event.fixed)?.fixed ?? null;
}

function highestSeverity(vulnerabilities: OsvVulnerability[]): Severity | null {
  const rank: Record<Severity, number> = {
    [Severity.LOW]: 1,
    [Severity.MODERATE]: 2,
    [Severity.HIGH]: 3,
    [Severity.CRITICAL]: 4,
  };
  let highest: Severity | null = null;

  for (const vulnerability of vulnerabilities) {
    const affected = vulnerability.affected?.find(
      (affected) => affected.package?.ecosystem === 'npm',
    );
    const severity = normalizeSeverity(
      affected?.ecosystem_specific?.severity
        ?? affected?.database_specific?.severity
        ?? vulnerability.database_specific?.severity,
    );
    if (severity && (!highest || rank[severity] > rank[highest])) highest = severity;
  }

  return highest;
}

function normalizeSeverity(value?: string): Severity | null {
  if (!value) return null;
  const normalized = value.trim().toUpperCase();
  if (normalized === 'LOW') return Severity.LOW;
  if (normalized === 'MODERATE' || normalized === 'MEDIUM') return Severity.MODERATE;
  if (normalized === 'HIGH') return Severity.HIGH;
  if (normalized === 'CRITICAL') return Severity.CRITICAL;

  const score = Number.parseFloat(normalized);
  if (!Number.isFinite(score)) return null;
  if (score >= 9) return Severity.CRITICAL;
  if (score >= 7) return Severity.HIGH;
  if (score >= 4) return Severity.MODERATE;
  return Severity.LOW;
}
