import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

export function TeamDirectory() {
  const { user } = useAuth();
  const [team, setTeam] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchTeam() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch('/api/team', { credentials: 'include' });
        if (res.status === 403) {
          throw new Error('Forbidden: Only Administrators and Managers can view the full team directory.');
        }
        if (!res.ok) {
          throw new Error('Failed to load team directory.');
        }
        const data = await res.json();
        setTeam(data.team || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchTeam();
  }, []);

  const roleBadges = {
    ADMIN: 'bg-purple-100 text-purple-800 border-purple-200',
    MANAGER: 'bg-blue-100 text-blue-800 border-blue-200',
    AGENT: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-8 py-8">
      {/* Title */}
      <div className="mb-6">
        <h1 className="font-display font-bold text-2xl sm:text-3xl text-on-surface tracking-tight">
          NovaWorks Team Directory
        </h1>
        <p className="text-sm text-on-surface-variant mt-1">
          Supplied organization roster used by AI for automated project manager selection and task skill matching.
        </p>
      </div>

      {/* Loading */}
      {loading && (
        <div className="py-16 text-center">
          <div className="w-8 h-8 border-3 border-primary/20 border-t-primary rounded-full animate-spin mx-auto"></div>
          <p className="text-sm text-on-surface-variant mt-3">Loading team directory...</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="p-4 rounded-xl bg-error-container text-on-error-container border border-error/20 flex items-center gap-2 mb-6">
          <span className="material-symbols-outlined text-error">error</span>
          <span className="text-sm">{error}</span>
        </div>
      )}

      {/* Team Cards Grid */}
      {!loading && !error && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {team.map((member) => (
            <div
              key={member.id}
              className="bg-surface-container-lowest rounded-2xl p-5 border border-outline-variant/30 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-surface-container-high text-primary font-bold flex items-center justify-center text-sm shadow-inner">
                      {member.name[0]}
                    </div>
                    <div>
                      <h3 className="font-display font-bold text-base text-on-surface leading-tight">
                        {member.name}
                      </h3>
                      <span className="text-xs text-on-surface-variant">{member.specialization}</span>
                    </div>
                  </div>

                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${roleBadges[member.role] || ''}`}>
                    {member.role}
                  </span>
                </div>

                <div className="mt-4 pt-3 border-t border-outline-variant/20">
                  <span className="text-[10px] uppercase font-bold text-on-surface-variant block mb-2">
                    Skills & Competencies
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {member.skills && member.skills.length > 0 ? (
                      member.skills.map((skill, sIdx) => (
                        <span
                          key={sIdx}
                          className="px-2 py-0.5 rounded-md bg-surface-container text-on-surface text-xs font-medium"
                        >
                          {skill}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-on-surface-variant italic">No skills listed</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 text-[11px] font-mono text-on-surface-variant text-right">
                ID: {member.id}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
