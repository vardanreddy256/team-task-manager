"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import AuthGate from "@/components/AuthGate";
import { api } from "@/lib/api";
import type { Project } from "@/lib/types";

export default function ProjectsPage() {
  return (
    <AuthGate>
      <ProjectsInner />
    </AuthGate>
  );
}

function ProjectsInner() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = () =>
    api
      .listProjects()
      .then(setProjects)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed"))
      .finally(() => setLoaded(true));

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      await api.createProject({ name, description: description || undefined });
      setName("");
      setDescription("");
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Your projects</h1>
        <button onClick={() => setShowForm((s) => !s)} className="btn-primary">
          {showForm ? "Cancel" : "New project"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={onCreate} className="card space-y-3">
          <div>
            <label className="label" htmlFor="name">Project name</label>
            <input
              id="name"
              className="input"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="description">
              Description (optional)
            </label>
            <textarea
              id="description"
              className="input min-h-[80px]"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <button className="btn-primary" disabled={submitting}>
            {submitting ? "Creating…" : "Create project"}
          </button>
        </form>
      )}

      {error && (
        <div className="rounded border border-red-200 bg-red-50 p-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {!loaded ? (
        <div className="text-slate-500">Loading…</div>
      ) : projects.length === 0 ? (
        <div className="card text-slate-600">
          You're not part of any projects yet. Create one to get started.
        </div>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {projects.map((p) => (
            <li key={p.id}>
              <Link
                href={`/projects/${p.id}`}
                className="card block hover:border-brand-500 hover:shadow-md"
              >
                <div className="flex items-start justify-between">
                  <h2 className="text-lg font-semibold text-slate-900">
                    {p.name}
                  </h2>
                </div>
                <p className="mt-1 line-clamp-2 text-sm text-slate-600">
                  {p.description || "No description."}
                </p>
                <div className="mt-3 text-xs text-slate-500">
                  Owner: {p.owner.full_name}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
