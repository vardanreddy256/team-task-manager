// Tiny fetch-based API client with automatic access-token refresh.
// Tokens are kept in localStorage; the access token is short-lived (30 min)
// and the refresh token is used to mint new access tokens transparently.

const API_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ||
  "http://localhost:8000";

const ACCESS_KEY = "ttm_access_token";
const REFRESH_KEY = "ttm_refresh_token";

export const tokenStore = {
  getAccess(): string | null {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(ACCESS_KEY);
  },
  getRefresh(): string | null {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(REFRESH_KEY);
  },
  set(access: string, refresh?: string) {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(ACCESS_KEY, access);
    if (refresh) window.localStorage.setItem(REFRESH_KEY, refresh);
  },
  clear() {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(ACCESS_KEY);
    window.localStorage.removeItem(REFRESH_KEY);
  },
};

export class ApiError extends Error {
  status: number;
  detail: unknown;
  constructor(status: number, detail: unknown, message: string) {
    super(message);
    this.status = status;
    this.detail = detail;
  }
}

async function tryRefresh(): Promise<boolean> {
  const refresh = tokenStore.getRefresh();
  if (!refresh) return false;

  const res = await fetch(`${API_URL}/api/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refresh }),
  });

  if (!res.ok) {
    tokenStore.clear();
    return false;
  }
  const data = await res.json();
  tokenStore.set(data.access_token);
  return true;
}

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  // If false, do not attach Authorization header (used for login/signup).
  authenticated?: boolean;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, authenticated = true } = options;

  const doFetch = async (): Promise<Response> => {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (authenticated) {
      const token = tokenStore.getAccess();
      if (token) headers["Authorization"] = `Bearer ${token}`;
    }
    return fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  };

  let res = await doFetch();

  // On 401, try refreshing once.
  if (res.status === 401 && authenticated) {
    const refreshed = await tryRefresh();
    if (refreshed) res = await doFetch();
  }

  if (res.status === 204) return undefined as T;

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    const detail =
      data?.detail ||
      data?.message ||
      `Request failed with status ${res.status}`;
    const message = Array.isArray(detail)
      ? detail.map((d: { msg?: string }) => d.msg).filter(Boolean).join("; ")
      : String(detail);
    throw new ApiError(res.status, data, message);
  }

  return data as T;
}

import type {
  DashboardSummary,
  Membership,
  Project,
  ProjectDetail,
  ProjectRole,
  Task,
  TaskPriority,
  TaskStatus,
  TokenPair,
  UserBrief,
  UserOut,
} from "./types";

export const api = {
  // auth
  signup: (data: { email: string; password: string; full_name: string }) =>
    request<TokenPair>("/api/auth/signup", {
      method: "POST",
      body: data,
      authenticated: false,
    }),
  login: (data: { email: string; password: string }) =>
    request<TokenPair>("/api/auth/login", {
      method: "POST",
      body: data,
      authenticated: false,
    }),
  me: () => request<UserOut>("/api/auth/me"),

  // users
  searchUsers: (q: string) =>
    request<UserBrief[]>(`/api/users/search?q=${encodeURIComponent(q)}`),

  // projects
  listProjects: () => request<Project[]>("/api/projects"),
  createProject: (data: { name: string; description?: string }) =>
    request<Project>("/api/projects", { method: "POST", body: data }),
  getProject: (id: number) => request<ProjectDetail>(`/api/projects/${id}`),
  updateProject: (
    id: number,
    data: { name?: string; description?: string },
  ) =>
    request<Project>(`/api/projects/${id}`, { method: "PATCH", body: data }),
  deleteProject: (id: number) =>
    request<void>(`/api/projects/${id}`, { method: "DELETE" }),

  // members
  addMember: (
    projectId: number,
    data: { email: string; role: ProjectRole },
  ) =>
    request<Membership>(`/api/projects/${projectId}/members`, {
      method: "POST",
      body: data,
    }),
  updateMemberRole: (projectId: number, userId: number, role: ProjectRole) =>
    request<Membership>(`/api/projects/${projectId}/members/${userId}`, {
      method: "PATCH",
      body: { role },
    }),
  removeMember: (projectId: number, userId: number) =>
    request<void>(`/api/projects/${projectId}/members/${userId}`, {
      method: "DELETE",
    }),

  // tasks
  listTasks: (
    projectId: number,
    filters: { status?: TaskStatus; assigneeId?: number } = {},
  ) => {
    const qs = new URLSearchParams();
    if (filters.status) qs.set("status", filters.status);
    if (filters.assigneeId !== undefined)
      qs.set("assignee_id", String(filters.assigneeId));
    const query = qs.toString();
    return request<Task[]>(
      `/api/projects/${projectId}/tasks${query ? "?" + query : ""}`,
    );
  },
  createTask: (
    projectId: number,
    data: {
      title: string;
      description?: string;
      status?: TaskStatus;
      priority?: TaskPriority;
      due_date?: string | null;
      assignee_id?: number | null;
    },
  ) =>
    request<Task>(`/api/projects/${projectId}/tasks`, {
      method: "POST",
      body: data,
    }),
  updateTask: (
    projectId: number,
    taskId: number,
    data: Partial<{
      title: string;
      description: string;
      status: TaskStatus;
      priority: TaskPriority;
      due_date: string | null;
      assignee_id: number | null;
    }>,
  ) =>
    request<Task>(`/api/projects/${projectId}/tasks/${taskId}`, {
      method: "PATCH",
      body: data,
    }),
  deleteTask: (projectId: number, taskId: number) =>
    request<void>(`/api/projects/${projectId}/tasks/${taskId}`, {
      method: "DELETE",
    }),

  // dashboard
  dashboard: () => request<DashboardSummary>("/api/dashboard"),
};
