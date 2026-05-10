"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import AuthGate from "@/components/AuthGate";
import { PriorityBadge, StatusBadge } from "@/components/StatusBadge";
import { api } from "@/lib/api";
import type { DashboardSummary } from "@/lib/types";

function fmtDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function DashboardPage() {
  return (
    <AuthGate>
      <DashboardInner />
    </AuthGate>
  );
}

function DashboardInner() {
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .dashboard()
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"));
  }, []);

  if (error)
    return <div className="text-red-700">Error: {error}</div>;
  if (!data) return <div className="text-slate-500">Loading dashboard…</div>;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-600">
          A summary of all tasks across the projects you're a member of.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        <Stat label="Projects" value={data.project_count} />
        <Stat label="Total tasks" value={data.total_tasks} />
        <Stat label="To do" value={data.status_counts.todo} />
        <Stat label="In progress" value={data.status_counts.in_progress} />
        <Stat
          label="Overdue"
          value={data.overdue_count}
          highlight={data.overdue_count > 0}
        />
      </div>

      <section className="card">
        <h2 className="mb-3 text-lg font-semibold">My open tasks</h2>
        {data.my_open_tasks.length === 0 ? (
          <p className="text-sm text-slate-500">Nothing assigned to you.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {data.my_open_tasks.map((t) => (
              <li
                key={t.id}
                className="flex flex-wrap items-center justify-between gap-2 py-2"
              >
                <div className="flex flex-col">
                  <Link
                    href={`/projects/${t.project_id}`}
                    className="font-medium text-slate-900 hover:underline"
                  >
                    {t.title}
                  </Link>
                  <span className="text-xs text-slate-500">
                    Due {fmtDate(t.due_date)}{" "}
                    {t.is_overdue && (
                      <span className="font-medium text-red-700">
                        (overdue)
                      </span>
                    )}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <PriorityBadge priority={t.priority} />
                  <StatusBadge status={t.status} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card">
        <h2 className="mb-3 text-lg font-semibold">Overdue</h2>
        {data.overdue_tasks.length === 0 ? (
          <p className="text-sm text-slate-500">Nothing overdue. Great work.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {data.overdue_tasks.map((t) => (
              <li
                key={t.id}
                className="flex items-center justify-between gap-2 py-2"
              >
                <div className="flex flex-col">
                  <Link
                    href={`/projects/${t.project_id}`}
                    className="font-medium text-slate-900 hover:underline"
                  >
                    {t.title}
                  </Link>
                  <span className="text-xs text-red-700">
                    Was due {fmtDate(t.due_date)}
                  </span>
                </div>
                <StatusBadge status={t.status} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border p-4 ${
        highlight
          ? "border-red-200 bg-red-50"
          : "border-slate-200 bg-white"
      }`}
    >
      <div className="text-xs uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div
        className={`text-2xl font-semibold ${
          highlight ? "text-red-700" : "text-slate-900"
        }`}
      >
        {value}
      </div>
    </div>
  );
}
