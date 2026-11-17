import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

export function ProjectDetails({ projectId, onBack }) {
  const { user } = useAuth();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('ALL');

  useEffect(() => {
    async function fetchProject() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/projects/${projectId}`, { credentials: 'include' });
        if (res.status === 403) {
          throw new Error('Forbidden: You do not have permission to view this project.');
        }
        if (res.status === 404) {
          throw new Error('Project not found.');
        }
        if (!res.ok) {
          throw new Error('Failed to load project details.');
        }
        const data = await res.json();
        setProject(data.project);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    if (projectId) {
      fetchProject();
    }
  }, [projectId]);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16 text-center">
        <div className="w-10 h-10 border-3 border-primary/20 border-t-primary rounded-full animate-spin mx-auto"></div>
        <p className="text-sm text-on-surface-variant mt-4">Loading project details...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-12">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline mb-6"
        >
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          <span>Back to Projects</span>
        </button>

        <div className="p-6 rounded-2xl bg-error-container text-on-error-container border border-error/20 flex items-start gap-4">
          <span className="material-symbols-outlined text-[24px] text-error">gpp_bad</span>
          <div>
            <h3 className="font-bold text-base">Access Denied or Not Found</h3>
            <p className="text-sm mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!project) return null;

  const totalHours = project.tasks?.reduce((acc, t) => acc + (t.estimatedHours || 0), 0) || 0;
  const deadlineFormatted = project.deadline ? new Date(project.deadline).toISOString().split('T')[0] : 'N/A';

  // Task filtering
  const filteredTasks = (project.tasks || []).filter((t) => {
    if (filter === 'ALL') return true;
    const titleLower = t.title.toLowerCase();
    const descLower = t.description.toLowerCase();
    if (filter === 'FRONTEND') {
      return titleLower.includes('ui') || titleLower.includes('frontend') || titleLower.includes('screen') || descLower.includes('screen');
    }
    if (filter === 'BACKEND') {
      return titleLower.includes('api') || titleLower.includes('backend') || descLower.includes('api') || descLower.includes('endpoint');
    }
    if (filter === 'TESTING') {
      return titleLower.includes('test') || titleLower.includes('integration') || descLower.includes('test');
    }
    return true;
  });

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-8 py-8">
      {/* Back Button */}
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-on-surface-variant hover:text-primary transition-colors mb-6 group cursor-pointer"
      >
        <span className="material-symbols-outlined text-[16px] group-hover:-translate-x-0.5 transition-transform">
          arrow_back
        </span>
        <span>Back to Project Portfolio</span>
      </button>

      {/* Project Overview Bento Block (matching Stitch code.html layout) */}
      <div className="bg-surface-container-lowest rounded-2xl p-6 sm:p-8 shadow-sm border border-outline-variant/30 relative overflow-hidden mb-8">
        {/* Ambient Intelligence Glow Accent */}
        <div className="absolute -right-12 -top-12 w-48 h-48 bg-gradient-to-br from-primary/10 via-tertiary-container/10 to-transparent rounded-full blur-2xl pointer-events-none"></div>

        {/* Live Meta Badges */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-fixed text-on-primary-fixed text-xs font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
            Active Delivery Cycle
          </span>
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-surface-container-high text-tertiary text-xs font-semibold">
            <span className="material-symbols-outlined text-[14px]">auto_awesome</span>
            AI Transcript Verified
          </span>
        </div>

        {/* Title & Metadata */}
        <h1 className="font-display font-bold text-2xl sm:text-3xl text-on-surface tracking-tight mb-2">
          {project.name}
        </h1>

        <div className="flex flex-wrap items-center gap-y-2 gap-x-6 text-sm text-on-surface-variant mb-6">
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[18px] text-secondary">domain</span>
            <span>Client: <strong className="text-on-surface font-semibold">{project.clientName}</strong></span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[18px] text-secondary">person_pin</span>
            <span>Manager: <strong className="text-on-surface font-semibold">{project.manager?.name}</strong></span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[18px] text-amber-500">calendar_today</span>
            <span>Deadline: <strong className="text-on-surface font-semibold">{deadlineFormatted}</strong></span>
          </div>
        </div>

        <p className="text-sm text-on-surface-variant leading-relaxed max-w-3xl mb-6">
          {project.description}
        </p>

        {/* Quick Metrics Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-surface-container-low/70 rounded-xl p-4 border border-outline-variant/20">
          <div className="flex flex-col items-center text-center">
            <span className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider">
              Total Effort
            </span>
            <span className="font-display text-xl font-bold text-on-surface mt-0.5">{totalHours}h</span>
          </div>
          <div className="flex flex-col items-center text-center">
            <span className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider">
              Tasks Count
            </span>
            <span className="font-display text-xl font-bold text-primary mt-0.5">{project.tasks?.length || 0}</span>
          </div>
          <div className="flex flex-col items-center text-center">
            <span className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider">
              Assigned Agents
            </span>
            <span className="font-display text-xl font-bold text-secondary mt-0.5">
              {new Set(project.tasks?.map((t) => t.assigneeId)).size}
            </span>
          </div>
          <div className="flex flex-col items-center text-center">
            <span className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider">
              Status
            </span>
            <span className="font-display text-xl font-bold text-emerald-600 mt-0.5">On Schedule</span>
          </div>
        </div>
      </div>

      {/* Interactive Filter Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h2 className="font-display font-bold text-xl text-on-surface">Sprint Tasks & Deliverables</h2>
          <p className="text-xs text-on-surface-variant">Extracted scope assigned to developer agents</p>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {['ALL', 'FRONTEND', 'BACKEND', 'TESTING'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                filter === f
                  ? 'bg-primary text-white shadow-sm'
                  : 'bg-surface-container text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
              }`}
            >
              {f === 'ALL' ? `All Tasks (${project.tasks?.length || 0})` : f}
            </button>
          ))}
        </div>
      </div>

      {/* Task Card Stream */}
      <div className="space-y-4">
        {filteredTasks.map((task) => {
          const taskDeadline = task.deadline ? new Date(task.deadline).toISOString().split('T')[0] : 'N/A';

          return (
            <div
              key={task.id}
              className="bg-surface-container-lowest rounded-xl p-5 border border-outline-variant/30 hover:border-primary/30 transition-all shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-surface-container-low text-xs font-semibold text-primary">
                    <span className="material-symbols-outlined text-[13px]">code</span>
                    Task
                  </span>
                  <span className="text-xs text-on-surface-variant flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px] text-amber-500">event</span>
                    Due {taskDeadline}
                  </span>
                </div>

                <h3 className="font-display font-bold text-base text-on-surface mb-1">
                  {task.title}
                </h3>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  {task.description}
                </p>
              </div>

              <div className="flex items-center gap-4 sm:border-l sm:border-outline-variant/30 sm:pl-6 shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs ring-1 ring-primary/20">
                    {task.assignee?.name?.[0] || 'A'}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-on-surface">{task.assignee?.name}</span>
                    <span className="text-[10px] text-on-surface-variant">{task.assignee?.specialization}</span>
                  </div>
                </div>

                <div className="px-3 py-1.5 rounded-lg bg-surface-container text-right">
                  <div className="text-xs font-bold text-primary">{task.estimatedHours}h</div>
                  <div className="text-[9px] uppercase font-semibold text-on-surface-variant">Effort</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
