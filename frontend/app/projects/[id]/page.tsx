"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import AuthGate from "@/components/AuthGate";
import { PriorityBadge, StatusBadge } from "@/components/StatusBadge";
import { api } from "@/lib/api";
import type {
  Membership,
  ProjectDetail,
  ProjectRole,
  Task,
  TaskPriority,
  TaskStatus,
} from "@/lib/types";

const STATUSES: TaskStatus[] = ["todo", "in_progress", "done"];
const PRIORITIES: TaskPriority[] = ["low", "medium", "high"];

function fmtDateInput(d: string | null) {
  if (!d) return "";
  return new Date(d).toISOString().slice(0, 10);
}

function fmtDate(d: string | null) {
  return d
    ? new Date(d).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      })
    : "—";
}

export default function ProjectDetailPage() {
  return (
    <AuthGate>
      <ProjectDetailInner />
    </AuthGate>
  );
}

function ProjectDetailInner() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const projectId = Number(params.id);

  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  const reload = async () => {
    setError(null);
    try {
      const [p, t] = await Promise.all([
        api.getProject(projectId),
        api.listTasks(projectId),
      ]);
      setProject(p);
      setTasks(t);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load project");
    } finally {
      setLoaded(true);
    }
  };

  useEffect(() => {
    if (Number.isFinite(projectId)) reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  if (!loaded) return <div className="text-slate-500">Loading…</div>;
  if (error)
    return <div className="text-red-700">Error: {error}</div>;
  if (!project) return null;

  const isAdmin = project.my_role === "admin";

  const onDeleteProject = async () => {
    if (!confirm("Delete this project and all its tasks? This is permanent.")) return;
    try {
      await api.deleteProject(project.id);
      router.push("/projects");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete");
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{project.name}</h1>
          <p className="mt-1 text-sm text-slate-600">
            {project.description || "No description."}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Owner: {project.owner.full_name} · Your role:{" "}
            <span className="font-medium">{project.my_role}</span>
          </p>
        </div>
        {isAdmin && (
          <button onClick={onDeleteProject} className="btn-danger">
            Delete project
          </button>
        )}
      </div>

      <TaskSection
        projectId={project.id}
        tasks={tasks}
        members={project.members}
        isAdmin={isAdmin}
        onChange={reload}
      />

      <MembersSection
        projectId={project.id}
        ownerId={project.owner.id}
        members={project.members}
        isAdmin={isAdmin}
        onChange={reload}
      />
    </div>
  );
}

// -------------------- Tasks --------------------

function TaskSection({
  projectId,
  tasks,
  members,
  isAdmin,
  onChange,
}: {
  projectId: number;
  tasks: Task[];
  members: Membership[];
  isAdmin: boolean;
  onChange: () => void | Promise<void>;
}) {
  const [showForm, setShowForm] = useState(false);

  const grouped: Record<TaskStatus, Task[]> = {
    todo: tasks.filter((t) => t.status === "todo"),
    in_progress: tasks.filter((t) => t.status === "in_progress"),
    done: tasks.filter((t) => t.status === "done"),
  };

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Tasks</h2>
        {isAdmin && (
          <button
            onClick={() => setShowForm((s) => !s)}
            className="btn-primary"
          >
            {showForm ? "Cancel" : "New task"}
          </button>
        )}
      </div>

      {showForm && isAdmin && (
        <NewTaskForm
          projectId={projectId}
          members={members}
          onCreated={async () => {
            setShowForm(false);
            await onChange();
          }}
        />
      )}

      <div className="grid gap-4 md:grid-cols-3">
        {STATUSES.map((status) => (
          <div key={status} className="space-y-2">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-600">
              {status === "todo"
                ? "To do"
                : status === "in_progress"
                ? "In progress"
                : "Done"}{" "}
              <span className="text-slate-400">({grouped[status].length})</span>
            </h3>
            {grouped[status].length === 0 && (
              <div className="rounded border border-dashed border-slate-200 p-3 text-xs text-slate-400">
                No tasks
              </div>
            )}
            {grouped[status].map((t) => (
              <TaskCard
                key={t.id}
                task={t}
                projectId={projectId}
                members={members}
                isAdmin={isAdmin}
                onChange={onChange}
              />
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}

function NewTaskForm({
  projectId,
  members,
  onCreated,
}: {
  projectId: number;
  members: Membership[];
  onCreated: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [dueDate, setDueDate] = useState("");
  const [assigneeId, setAssigneeId] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await api.createTask(projectId, {
        title,
        description: description || undefined,
        priority,
        due_date: dueDate ? new Date(dueDate).toISOString() : null,
        assignee_id: assigneeId ? Number(assigneeId) : null,
      });
      onCreated();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="card mb-4 space-y-3">
      <div>
        <label className="label">Title</label>
        <input
          className="input"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>
      <div>
        <label className="label">Description</label>
        <textarea
          className="input min-h-[60px]"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <div>
          <label className="label">Priority</label>
          <select
            className="input"
            value={priority}
            onChange={(e) => setPriority(e.target.value as TaskPriority)}
          >
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Due date</label>
          <input
            type="date"
            className="input"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </div>
        <div>
          <label className="label">Assignee</label>
          <select
            className="input"
            value={assigneeId}
            onChange={(e) => setAssigneeId(e.target.value)}
          >
            <option value="">Unassigned</option>
            {members.map((m) => (
              <option key={m.user.id} value={m.user.id}>
                {m.user.full_name}
              </option>
            ))}
          </select>
        </div>
      </div>
      {error && (
        <div className="rounded border border-red-200 bg-red-50 p-2 text-sm text-red-700">
          {error}
        </div>
      )}
      <button className="btn-primary" disabled={submitting}>
        {submitting ? "Creating…" : "Create task"}
      </button>
    </form>
  );
}

function TaskCard({
  task,
  projectId,
  members,
  isAdmin,
  onChange,
}: {
  task: Task;
  projectId: number;
  members: Membership[];
  isAdmin: boolean;
  onChange: () => void | Promise<void>;
}) {
  const [editing, setEditing] = useState(false);

  const updateStatus = async (status: TaskStatus) => {
    try {
      await api.updateTask(projectId, task.id, { status });
      await onChange();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to update task");
    }
  };

  const onDelete = async () => {
    if (!confirm("Delete this task?")) return;
    try {
      await api.deleteTask(projectId, task.id);
      await onChange();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed");
    }
  };

  if (editing && isAdmin) {
    return (
      <EditTaskCard
        task={task}
        projectId={projectId}
        members={members}
        onCancel={() => setEditing(false)}
        onSaved={async () => {
          setEditing(false);
          await onChange();
        }}
      />
    );
  }

  return (
    <div className="card space-y-2">
      <div className="flex items-start justify-between gap-2">
        <h4 className="font-medium text-slate-900">{task.title}</h4>
        <PriorityBadge priority={task.priority} />
      </div>
      {task.description && (
        <p className="text-sm text-slate-600">{task.description}</p>
      )}
      <div className="text-xs text-slate-500">
        Assignee: {task.assignee?.full_name || "Unassigned"} · Due{" "}
        {fmtDate(task.due_date)}{" "}
        {task.is_overdue && (
          <span className="font-medium text-red-700">(overdue)</span>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2 pt-1">
        <select
          className="rounded border border-slate-300 px-2 py-1 text-xs"
          value={task.status}
          onChange={(e) => updateStatus(e.target.value as TaskStatus)}
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.replace("_", " ")}
            </option>
          ))}
        </select>
        {isAdmin && (
          <>
            <button
              onClick={() => setEditing(true)}
              className="text-xs text-brand-700 hover:underline"
            >
              Edit
            </button>
            <button
              onClick={onDelete}
              className="text-xs text-red-700 hover:underline"
            >
              Delete
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function EditTaskCard({
  task,
  projectId,
  members,
  onCancel,
  onSaved,
}: {
  task: Task;
  projectId: number;
  members: Membership[];
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || "");
  const [priority, setPriority] = useState<TaskPriority>(task.priority);
  const [dueDate, setDueDate] = useState(fmtDateInput(task.due_date));
  const [assigneeId, setAssigneeId] = useState(
    task.assignee?.id ? String(task.assignee.id) : "",
  );
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.updateTask(projectId, task.id, {
        title,
        description,
        priority,
        due_date: dueDate ? new Date(dueDate).toISOString() : null,
        assignee_id: assigneeId ? Number(assigneeId) : null,
      });
      onSaved();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="card space-y-2">
      <input
        className="input"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <textarea
        className="input min-h-[60px]"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />
      <div className="grid gap-2 md:grid-cols-3">
        <select
          className="input"
          value={priority}
          onChange={(e) => setPriority(e.target.value as TaskPriority)}
        >
          {PRIORITIES.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <input
          type="date"
          className="input"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
        />
        <select
          className="input"
          value={assigneeId}
          onChange={(e) => setAssigneeId(e.target.value)}
        >
          <option value="">Unassigned</option>
          {members.map((m) => (
            <option key={m.user.id} value={m.user.id}>
              {m.user.full_name}
            </option>
          ))}
        </select>
      </div>
      <div className="flex gap-2">
        <button className="btn-primary" disabled={submitting}>
          Save
        </button>
        <button type="button" className="btn-secondary" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}

// -------------------- Members --------------------

function MembersSection({
  projectId,
  ownerId,
  members,
  isAdmin,
  onChange,
}: {
  projectId: number;
  ownerId: number;
  members: Membership[];
  isAdmin: boolean;
  onChange: () => void | Promise<void>;
}) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<ProjectRole>("member");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await api.addMember(projectId, { email, role });
      setEmail("");
      await onChange();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setSubmitting(false);
    }
  };

  const onUpdateRole = async (userId: number, newRole: ProjectRole) => {
    try {
      await api.updateMemberRole(projectId, userId, newRole);
      await onChange();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed");
    }
  };

  const onRemove = async (userId: number) => {
    if (!confirm("Remove this member?")) return;
    try {
      await api.removeMember(projectId, userId);
      await onChange();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed");
    }
  };

  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold">Members</h2>

      {isAdmin && (
        <form onSubmit={onAdd} className="card mb-4 flex flex-wrap gap-3">
          <input
            type="email"
            placeholder="Email of user to add"
            className="input flex-1"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <select
            className="input w-32"
            value={role}
            onChange={(e) => setRole(e.target.value as ProjectRole)}
          >
            <option value="member">Member</option>
            <option value="admin">Admin</option>
          </select>
          <button className="btn-primary" disabled={submitting}>
            {submitting ? "Adding…" : "Add member"}
          </button>
          {error && (
            <div className="w-full rounded border border-red-200 bg-red-50 p-2 text-sm text-red-700">
              {error}
            </div>
          )}
        </form>
      )}

      <div className="card divide-y divide-slate-100">
        {members.map((m) => {
          const isOwner = m.user.id === ownerId;
          return (
            <div
              key={m.id}
              className="flex flex-wrap items-center justify-between gap-2 py-2 first:pt-0 last:pb-0"
            >
              <div>
                <div className="font-medium text-slate-900">
                  {m.user.full_name}{" "}
                  {isOwner && (
                    <span className="ml-1 text-xs text-slate-500">(owner)</span>
                  )}
                </div>
                <div className="text-xs text-slate-500">{m.user.email}</div>
              </div>
              <div className="flex items-center gap-2">
                {isAdmin && !isOwner ? (
                  <select
                    className="rounded border border-slate-300 px-2 py-1 text-xs"
                    value={m.role}
                    onChange={(e) =>
                      onUpdateRole(m.user.id, e.target.value as ProjectRole)
                    }
                  >
                    <option value="member">Member</option>
                    <option value="admin">Admin</option>
                  </select>
                ) : (
                  <span className="text-xs uppercase tracking-wide text-slate-500">
                    {m.role}
                  </span>
                )}
                {isAdmin && !isOwner && (
                  <button
                    onClick={() => onRemove(m.user.id)}
                    className="text-xs text-red-700 hover:underline"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
