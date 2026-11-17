import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

export function AgentTasks() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchMyTasks() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch('/api/tasks/my', { credentials: 'include' });
        if (!res.ok) {
          throw new Error('Failed to load assigned tasks');
        }
        const data = await res.json();
        setTasks(data.tasks || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchMyTasks();
  }, []);

  const totalAssigned = tasks.length;
  const totalHours = tasks.reduce((acc, t) => acc + (t.estimatedHours || 0), 0);
  const distinctProjects = new Set(tasks.map((t) => t.project?.id).filter(Boolean)).size;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-8 py-8">
      {/* Top Greeting & Context Card (matching Stitch code.html layout) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display font-bold text-2xl sm:text-3xl text-on-surface tracking-tight">
            My Tasks & Deliverables
          </h1>
          <p className="text-sm text-on-surface-variant mt-1 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
            Logged in as <strong className="text-on-surface">{user.name}</strong> ({user.specialization})
          </p>
        </div>

        <div className="flex items-center gap-1.5 bg-surface-container-high px-3 py-1.5 rounded-full text-primary w-fit">
          <span className="material-symbols-outlined text-[18px]">bolt</span>
          <span className="text-xs font-bold uppercase tracking-wider">High Velocity Agent</span>
        </div>
      </div>

      {/* Workload Overview Banner with ambient AI gradient */}
      <div className="relative overflow-hidden rounded-2xl bg-surface-container-lowest p-6 border border-outline-variant/30 shadow-sm mb-8">
        <div className="absolute -right-10 -bottom-10 w-36 h-36 rounded-full bg-primary-fixed-dim/30 blur-2xl pointer-events-none"></div>

        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
              Workload Health
            </span>
            <span className="material-symbols-outlined text-[16px] text-tertiary-container">speed</span>
          </div>
          <span className="text-xs text-primary font-semibold bg-primary-fixed/40 px-2.5 py-0.5 rounded-full">
            Sprint Active (2026)
          </span>
        </div>

        {/* Quick Metrics Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-surface-container-low/70 py-3 px-2 rounded-xl text-center">
            <span className="font-display text-2xl font-bold text-on-surface">{totalAssigned}</span>
            <span className="text-[10px] uppercase font-bold text-on-surface-variant block mt-0.5">
              Assigned Tasks
            </span>
          </div>

          <div className="bg-surface-container-low/70 py-3 px-2 rounded-xl text-center">
            <span className="font-display text-2xl font-bold text-primary">{totalHours}h</span>
            <span className="text-[10px] uppercase font-bold text-on-surface-variant block mt-0.5">
              Allocated Hours
            </span>
          </div>

          <div className="bg-surface-container-low/70 py-3 px-2 rounded-xl text-center">
            <span className="font-display text-2xl font-bold text-tertiary">{distinctProjects}</span>
            <span className="text-[10px] uppercase font-bold text-on-surface-variant block mt-0.5">
              Client Projects
            </span>
          </div>

          <div className="bg-emerald-50 py-3 px-2 rounded-xl text-center border border-emerald-100">
            <span className="font-display text-2xl font-bold text-emerald-700">100%</span>
            <span className="text-[10px] uppercase font-bold text-emerald-800 block mt-0.5">
              Role Scoped
            </span>
          </div>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="py-12 text-center">
          <div className="w-8 h-8 border-3 border-primary/20 border-t-primary rounded-full animate-spin mx-auto"></div>
          <p className="text-sm text-on-surface-variant mt-3">Loading your assigned tasks...</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="p-4 rounded-xl bg-error-container text-on-error-container border border-error/20 flex items-center gap-2 mb-6">
          <span className="material-symbols-outlined text-error">error</span>
          <span className="text-sm">{error}</span>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && tasks.length === 0 && (
        <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 p-12 text-center flex flex-col items-center">
          <div className="w-16 h-16 rounded-2xl bg-surface-container-high flex items-center justify-center text-on-surface-variant mb-4">
            <span className="material-symbols-outlined text-[32px]">task</span>
          </div>
          <h3 className="font-display font-bold text-lg text-on-surface">No Assigned Tasks</h3>
          <p className="text-sm text-on-surface-variant max-w-md mt-1">
            You do not currently have any active tasks assigned to your account.
          </p>
        </div>
      )}

      {/* Tasks Stream */}
      {!loading && !error && tasks.length > 0 && (
        <div className="space-y-4">
          <h2 className="font-display font-bold text-lg text-on-surface">Active Task Assignments</h2>

          {tasks.map((task) => {
            const taskDeadline = task.deadline ? new Date(task.deadline).toISOString().split('T')[0] : 'N/A';
            const projDeadline = task.project?.deadline
              ? new Date(task.project.deadline).toISOString().split('T')[0]
              : 'N/A';

            return (
              <div
                key={task.id}
                className="bg-surface-container-lowest rounded-xl p-5 border border-outline-variant/30 shadow-sm hover:border-primary/40 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="flex-1">
                  {/* Related Project Meta Pill */}
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-primary-fixed text-on-primary-fixed text-xs font-bold">
                      <span className="material-symbols-outlined text-[13px]">folder</span>
                      {task.project?.name || 'Project'}
                    </span>
                    <span className="text-xs text-on-surface-variant font-medium">
                      Client: <strong>{task.project?.clientName}</strong>
                    </span>
                  </div>

                  <h3 className="font-display font-bold text-base text-on-surface mb-1">
                    {task.title}
                  </h3>
                  <p className="text-xs text-on-surface-variant leading-relaxed mb-3">
                    {task.description}
                  </p>

                  <div className="flex items-center gap-4 text-xs text-on-surface-variant">
                    <span className="flex items-center gap-1 font-medium text-amber-600">
                      <span className="material-symbols-outlined text-[15px]">event</span>
                      Task Due: {taskDeadline}
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[15px]">flag</span>
                      Project Delivery: {projDeadline}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between md:flex-col md:items-end gap-2 shrink-0 md:border-l md:border-outline-variant/30 md:pl-6">
                  <div className="px-3.5 py-1.5 rounded-lg bg-surface-container-low text-center">
                    <div className="text-sm font-bold text-primary">{task.estimatedHours}h</div>
                    <div className="text-[9px] uppercase font-semibold text-on-surface-variant">Effort</div>
                  </div>

                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                    Assigned
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
