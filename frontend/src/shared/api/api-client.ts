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

export interface GitEvent {
  id: string;
  repositoryId: string;
  repositoryName: string;
  type: GitEventType;
  action?: string | null;
  status?: string | null;
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
    throw new Error(message ?? `La requête a échoué (${response.status}).`);
  }

  return response.status === 204 ? (undefined as T) : response.json();
}

export const apiClient = {
  getCurrentUser: () => request<CurrentUser>("/auth/me"),
  logout: () => request<void>("/auth/logout", { method: "POST" }),
  getRepositories: () => request<Repository[]>("/repositories"),
  getEvents: (page = 1, limit = 20) =>
    request<GitEventPage>(`/events?page=${page}&limit=${limit}`),
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
