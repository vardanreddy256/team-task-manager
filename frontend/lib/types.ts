// Shared API response types — keep in sync with backend Pydantic schemas.

export type ProjectRole = "admin" | "member";
export type TaskStatus = "todo" | "in_progress" | "done";
export type TaskPriority = "low" | "medium" | "high";

export interface UserBrief {
  id: number;
  email: string;
  full_name: string;
}

export interface UserOut extends UserBrief {
  is_active: boolean;
  created_at: string;
}

export interface TokenPair {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface Membership {
  id: number;
  user: UserBrief;
  role: ProjectRole;
  joined_at: string;
}

export interface Project {
  id: number;
  name: string;
  description: string | null;
  owner: UserBrief;
  created_at: string;
}

export interface ProjectDetail extends Project {
  members: Membership[];
  my_role: ProjectRole | null;
  task_count: number;
}

export interface Task {
  id: number;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;
  project_id: number;
  creator: UserBrief | null;
  assignee: UserBrief | null;
  created_at: string;
  updated_at: string;
  is_overdue: boolean;
}

export interface DashboardSummary {
  total_tasks: number;
  status_counts: { todo: number; in_progress: number; done: number };
  overdue_count: number;
  my_open_tasks: Task[];
  overdue_tasks: Task[];
  project_count: number;
}
