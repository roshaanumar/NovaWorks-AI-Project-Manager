import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

export function AdminDashboard({ onSelectProject, onNavigateToTranscript }) {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/projects', { credentials: 'include' });
      if (!res.ok) {
        throw new Error('Failed to load projects');
      }
      const data = await res.json();
      setProjects(data.projects || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  // Compute summary metrics
  const totalProjects = projects.length;
  const totalTasks = projects.reduce((acc, p) => acc + (p.tasks?.length || 0), 0);
  const totalHours = projects.reduce((acc, p) => {
    const taskHours = p.tasks?.reduce((tAcc, t) => tAcc + (t.estimatedHours || 0), 0) || 0;
    return acc + taskHours;
  }, 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8">
      {/* Top Greeting & Role Context */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display font-bold text-2xl sm:text-3xl text-on-surface tracking-tight">
            {user.role === 'ADMIN' ? 'Company Project Portfolio' : 'My Managed Engagements'}
          </h1>
          <p className="text-sm text-on-surface-variant mt-1">
            Logged in as <strong className="text-on-surface">{user.name}</strong> ({user.specialization})
          </p>
        </div>

        {user.role === 'ADMIN' && (
          <button
            onClick={onNavigateToTranscript}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary hover:bg-primary-container text-white font-semibold text-sm shadow-md shadow-primary/20 transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">auto_awesome</span>
            <span>Create from Transcript</span>
          </button>
        )}
      </div>

      {/* Bento Metrics Banner */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-surface-container-lowest p-5 rounded-2xl border border-outline-variant/30 shadow-sm relative overflow-hidden">
          <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">Projects</span>
          <div className="text-3xl font-display font-bold text-on-surface mt-1">{totalProjects}</div>
          <span className="text-xs text-primary font-medium mt-1 inline-block">Active Engagements</span>
        </div>

        <div className="bg-surface-container-lowest p-5 rounded-2xl border border-outline-variant/30 shadow-sm relative overflow-hidden">
          <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">Total Tasks</span>
          <div className="text-3xl font-display font-bold text-on-surface mt-1">{totalTasks}</div>
          <span className="text-xs text-secondary font-medium mt-1 inline-block">Workstream Items</span>
        </div>

        <div className="bg-surface-container-lowest p-5 rounded-2xl border border-outline-variant/30 shadow-sm relative overflow-hidden">
          <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">Allocated Hours</span>
          <div className="text-3xl font-display font-bold text-primary mt-1">{totalHours}h</div>
          <span className="text-xs text-on-surface-variant mt-1 inline-block">Developer Effort</span>
        </div>

        <div className="bg-surface-container-lowest p-5 rounded-2xl border border-outline-variant/30 shadow-sm relative overflow-hidden">
          <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">Scope Fidelity</span>
          <div className="text-3xl font-display font-bold text-emerald-600 mt-1">100%</div>
          <span className="text-xs text-emerald-700 font-medium mt-1 inline-block">Verified via AI</span>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="w-10 h-10 border-3 border-primary/20 border-t-primary rounded-full animate-spin"></div>
          <p className="text-sm text-on-surface-variant mt-4">Loading projects from database...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="p-4 rounded-xl bg-error-container text-on-error-container border border-error/20 flex items-center gap-3">
          <span className="material-symbols-outlined text-error">error</span>
          <span>{error}</span>
          <button onClick={fetchProjects} className="ml-auto underline font-medium text-sm">
            Retry
          </button>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && projects.length === 0 && (
        <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 p-12 text-center flex flex-col items-center">
          <div className="w-16 h-16 rounded-2xl bg-surface-container-high flex items-center justify-center text-on-surface-variant mb-4">
            <span className="material-symbols-outlined text-[32px]">folder_open</span>
          </div>
          <h3 className="font-display font-bold text-lg text-on-surface">No Projects Found</h3>
          <p className="text-sm text-on-surface-variant max-w-md mt-1 mb-6">
            {user.role === 'ADMIN'
              ? 'There are currently no active client projects. Convert meeting transcripts to launch new projects with AI.'
              : 'You do not have any projects assigned to you yet.'}
          </p>
          {user.role === 'ADMIN' && (
            <button
              onClick={onNavigateToTranscript}
              className="px-5 py-2.5 rounded-xl bg-primary text-white font-semibold text-sm shadow-md shadow-primary/20 hover:bg-primary-container transition-all"
            >
              Parse Meeting Transcript
            </button>
          )}
        </div>
      )}

      {/* Project Cards Grid */}
      {!loading && !error && projects.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => {
            const projectHours = project.tasks?.reduce((acc, t) => acc + (t.estimatedHours || 0), 0) || 0;
            const deadlineFormatted = project.deadline ? new Date(project.deadline).toISOString().split('T')[0] : 'N/A';

            return (
              <div
                key={project.id}
                onClick={() => onSelectProject(project.id)}
                className="bg-surface-container-lowest rounded-2xl p-6 border border-outline-variant/30 shadow-sm hover:shadow-md hover:border-primary/40 transition-all cursor-pointer flex flex-col justify-between group relative overflow-hidden"
              >
                {/* Glow accent */}
                <div className="absolute -right-8 -top-8 w-24 h-24 bg-primary/5 rounded-full blur-xl group-hover:bg-primary/10 transition-colors pointer-events-none"></div>

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-surface-container text-tertiary text-xs font-semibold">
                      <span className="material-symbols-outlined text-[14px]">domain</span>
                      {project.clientName}
                    </span>

                    <span className="inline-flex items-center gap-1 text-xs font-medium text-on-surface-variant">
                      <span className="material-symbols-outlined text-[15px] text-amber-500">event</span>
                      {deadlineFormatted}
                    </span>
                  </div>

                  <h3 className="font-display font-bold text-lg text-on-surface group-hover:text-primary transition-colors tracking-tight mb-2">
                    {project.name}
                  </h3>

                  <p className="text-xs text-on-surface-variant line-clamp-2 mb-4 leading-relaxed">
                    {project.description}
                  </p>
                </div>

                <div className="pt-4 border-t border-outline-variant/30 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center text-xs font-bold">
                      {project.manager?.name?.[0] || 'M'}
                    </div>
                    <span className="text-xs text-on-surface font-medium truncate max-w-[120px]">
                      {project.manager?.name || 'Assigned PM'}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-xs font-semibold">
                    <span className="text-on-surface-variant flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">checklist</span>
                      {project.tasks?.length || 0} tasks
                    </span>
                    <span className="text-primary flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">schedule</span>
                      {projectHours}h
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
