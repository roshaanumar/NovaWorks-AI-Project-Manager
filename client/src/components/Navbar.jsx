import React from 'react';
import { useAuth } from '../context/AuthContext';

export function Navbar({ currentView, setCurrentView }) {
  const { user, logout } = useAuth();

  if (!user) return null;

  const roleColors = {
    ADMIN: 'bg-purple-100 text-purple-800 border-purple-200',
    MANAGER: 'bg-blue-100 text-blue-800 border-blue-200',
    AGENT: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  };

  return (
    <header className="sticky top-0 z-40 bg-surface-container-lowest/90 backdrop-blur-md border-b border-outline-variant/30 px-4 sm:px-8 py-3 transition-all">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => setCurrentView(user.role === 'AGENT' ? 'tasks' : 'projects')}>
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-primary to-primary-container flex items-center justify-center text-white shadow-md shadow-primary/20">
            <span className="material-symbols-outlined text-[20px]">auto_awesome</span>
          </div>
          <div>
            <div className="font-display font-bold text-lg text-on-surface tracking-tight flex items-center gap-1.5">
              <span>NovaWorks</span>
              <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-primary-fixed text-on-primary-fixed">
                AI CRM
              </span>
            </div>
            <p className="text-[11px] text-on-surface-variant hidden sm:block">Intelligent Project Delivery</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1.5 sm:gap-2">
          {user.role === 'ADMIN' && (
            <>
              <button
                onClick={() => setCurrentView('projects')}
                className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${
                  currentView === 'projects' || currentView === 'project-details'
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">dashboard</span>
                <span>Projects</span>
              </button>

              <button
                onClick={() => setCurrentView('transcript')}
                className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${
                  currentView === 'transcript'
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">record_voice_over</span>
                <span>AI Transcript</span>
              </button>

              <button
                onClick={() => setCurrentView('team')}
                className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${
                  currentView === 'team'
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">groups</span>
                <span>Team</span>
              </button>
            </>
          )}

          {user.role === 'MANAGER' && (
            <>
              <button
                onClick={() => setCurrentView('projects')}
                className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${
                  currentView === 'projects' || currentView === 'project-details'
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">folder_managed</span>
                <span>My Projects</span>
              </button>

              <button
                onClick={() => setCurrentView('team')}
                className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${
                  currentView === 'team'
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">groups</span>
                <span>Team</span>
              </button>
            </>
          )}

          {user.role === 'AGENT' && (
            <button
              onClick={() => setCurrentView('tasks')}
              className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${
                currentView === 'tasks'
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">task_alt</span>
              <span>My Tasks</span>
            </button>
          )}
        </nav>

        {/* User Badge & Logout */}
        <div className="flex items-center gap-3">
          <div className="hidden md:flex flex-col text-right">
            <span className="text-sm font-semibold text-on-surface leading-tight">{user.name}</span>
            <span className="text-xs text-on-surface-variant">{user.specialization}</span>
          </div>

          <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold border uppercase tracking-wider ${roleColors[user.role] || ''}`}>
            {user.role}
          </span>

          <button
            onClick={logout}
            title="Log out"
            className="p-1.5 rounded-lg text-on-surface-variant hover:text-error hover:bg-error-container/40 transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">logout</span>
          </button>
        </div>
      </div>
    </header>
  );
}
