const apiBaseUrl = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000").replace(/\/$/, "");

export interface CurrentUser {
  id: string;
  githubLogin: string;
}

export interface Repository {
  id: string;
  owner: string;
  name: string;
  fullName: string;
  isActive: boolean;
  createdAt: string;
  webhookUrl: string;
}

export interface NewRepository extends Repository {
  /** Returned once at creation so the user can configure the GitHub webhook. */
  webhookSecret: string;
}

export type GitEventType = "PUSH" | "PULL_REQUEST" | "ISSUE";
export type GitEventStatus = "OPEN" | "CLOSED" | "MERGED";

export interface GitEventFilters {
  repositoryId?: string;
  type?: GitEventType;
  status?: GitEventStatus;
  actorLogin?: string;
}

export interface GitEvent {
  id: string;
  repositoryId: string;
  repositoryName: string;
  type: GitEventType;
  action?: string | null;
  status?: GitEventStatus | null;
  actorLogin: string;
  actorAvatar?: string | null;
  title: string;
  url?: string | null;
  occurredAt: string;
}

export interface GitEventPage {
  items: GitEvent[];
  total: number;
  page: number;
  limit: number;
}

export interface DependencyFinding {
  id: string;
  packageName: string;
  currentRange: string;
  installedVersion: string | null;
  latestVersion: string | null;
  isOutdated: boolean;
  severity: "LOW" | "MODERATE" | "HIGH" | "CRITICAL" | null;
  advisoryId: string | null;
  advisoryUrl: string | null;
  fixedVersion: string | null;
}

export interface DependencyScan {
  id: string;
  source: "PASTED" | "REPOSITORY";
  repository: { fullName: string } | null;
  createdAt: string;
  findings: DependencyFinding[];
}

export interface DependencyScanJobStatus {
  id: string;
  state: string;
  progress: number;
  result: DependencyScan | null;
  error: string | null;
}

export interface DailyDigest {
  id: string;
  repositoryId: string;
  repository: { fullName: string };
  date: string;
  summary: string | null;
  eventCount: number;
  model: string | null;
  status: "PENDING" | "GENERATED" | "FAILED";
  createdAt: string;
}

export interface DigestJobStatus {
  id: string;
  state: string;
  result: { digestIds: string[] } | null;
  error: string | null;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${apiBaseUrl}/api${path}`, {
    ...options,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...options.headers },
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    const message = Array.isArray(errorBody.message)
      ? errorBody.message.join(" ")
      : errorBody.message;
    throw new ApiError(message ?? `La requête a échoué (${response.status}).`, response.status);
  }

  return response.status === 204 ? (undefined as T) : response.json();
}

export class ApiError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = "ApiError";
  }
}

export function isUnauthorizedError(error: unknown) {
  return error instanceof ApiError && error.status === 401;
}

export const apiClient = {
  getCurrentUser: () => request<CurrentUser>("/auth/me"),
  logout: () => request<void>("/auth/logout", { method: "POST" }),
  getRepositories: () => request<Repository[]>("/repositories"),
  getEvents: (page = 1, limit = 20, filters: GitEventFilters = {}) => {
    const query = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (filters.repositoryId) query.set("repositoryId", filters.repositoryId);
    if (filters.type) query.set("type", filters.type);
    if (filters.status) query.set("status", filters.status);
    if (filters.actorLogin) query.set("actorLogin", filters.actorLogin);

    return request<GitEventPage>(`/events?${query.toString()}`);
  },
  getDependencyScans: () => request<DependencyScan[]>("/dependencies/scans"),
  scanPackageJson: (packageJson: Record<string, unknown>, packageLock?: Record<string, unknown>) =>
    request<{ id: string }>("/dependencies/scans", {
      method: "POST",
      body: JSON.stringify({ packageJson, ...(packageLock ? { packageLock } : {}) }),
    }),
  scanRepositoryDependencies: (repositoryId: string, packageJsonPath = "package.json", packageLockPath?: string) =>
    request<{ id: string }>("/dependencies/repository-scans", {
      method: "POST",
      body: JSON.stringify({ repositoryId, packageJsonPath, ...(packageLockPath ? { packageLockPath } : {}) }),
    }),
  getDependencyScanJob: (jobId: string) =>
    request<DependencyScanJobStatus>(`/dependencies/scans/jobs/${encodeURIComponent(jobId)}`),
  getDigests: () => request<DailyDigest[]>("/digests"),
  generateDigest: (repositoryId: string, date: string) =>
    request<{ id: string }>("/digests/generate", {
      method: "POST",
      body: JSON.stringify({ repositoryId, date }),
    }),
  getDigestJob: (jobId: string) =>
    request<DigestJobStatus>(`/digests/jobs/${encodeURIComponent(jobId)}`),
  createRepository: (repository: { owner: string; name: string }) =>
    request<NewRepository>("/repositories", {
      method: "POST",
      body: JSON.stringify(repository),
    }),
  rotateWebhookSecret: (repositoryId: string) =>
    request<NewRepository>(`/repositories/${repositoryId}/webhook-secret/rotate`, {
      method: "POST",
    }),
  getGitHubLoginUrl: () => `${apiBaseUrl}/api/auth/github`,
};
