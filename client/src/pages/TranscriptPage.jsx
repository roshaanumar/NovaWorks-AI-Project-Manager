import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

export function TranscriptPage({ onProjectCreated }) {
  const { user } = useAuth();
  const [transcript, setTranscript] = useState('');
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState(null);
  const [draft, setDraft] = useState(null);
  const [warnings, setWarnings] = useState([]);
  const [idempotencyKey, setIdempotencyKey] = useState('');

  const [teamManagers, setTeamManagers] = useState([]);
  const [teamAgents, setTeamAgents] = useState([]);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [successResult, setSuccessResult] = useState(null);

  // Fetch team directory for manager/agent dropdown selectors
  useEffect(() => {
    async function loadTeam() {
      try {
        const res = await fetch('/api/team', { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          setTeamManagers(data.team.filter((m) => m.role === 'MANAGER'));
          setTeamAgents(data.team.filter((m) => m.role === 'AGENT'));
        }
      } catch (e) {
        console.error('Error fetching team for dropdowns:', e);
      }
    }
    loadTeam();
  }, []);

  // Preset transcript samples
  const presets = {
    official: `Meeting: NovaWorks Client Delivery Planning
Date: 7 October 2026 | Scheduled duration: 60 minutes
Participants: Ayesha, Bilal, Hina, Ali, Hamza, Sara, Usman, Zain, Maryam

09:00-09:04 | Opening and company workflow
Ayesha: Good morning. We have three client engagements to plan today: UrbanCart Clothing's website, QuickServe's customer mobile app, and HelpDeskPro's AI support assistant. Please keep these as three separate projects. A combined project would make client reporting confusing.
Bilal: We should finish with a project manager, deadline, task owner, and estimated hours for every piece of work.
Hina: Agreed. Please use our supplied team directory.

09:04-09:08 | UrbanCart project scope
Ayesha: First project is UrbanCart Website, for client UrbanCart Clothing. I'll manage it. They need a responsive website where customers can browse products, view product details, and add items to a demo cart. We initially discussed 18 October as the delivery date.
Ali: Do they need a real checkout, payment gateway, and stock integration?
Ayesha: No. For this phase the cart is a demo. Real payments and inventory integration are not included. Don't add a payment task or an inventory task.
Ali: I can own the product catalog interface: product listing, product detail screen, and responsive layout. Put that down as 12 estimated hours, due on 12 October.
Ayesha: Please call that task Product catalog UI. We also need the demo cart interface as a separate task.
Ali: Yes. Demo cart UI will take 8 hours, due 15 October.
Hamza: For Product and cart APIs, I estimate 14 hours. I own it, and the deadline is 14 October.
Ayesha: Good. After that, Ali owns Website integration and testing. Let's start with a six-hour estimate and a 17 October deadline.
Ali: Six hours is reasonable. But please move that task to 19 October.
Ayesha: Accepted. Website integration and testing is 6 hours, due 19 October. Also, the client has just confirmed that final project delivery can be 20 October. That replaces the earlier 18 October date. The final UrbanCart project deadline is 20 October.`,

    quickserve: `Bilal: The second project is QuickServe Mobile App, for client QuickServe Services. I am the project manager. The client needs a customer app for signing in, requesting a service, and seeing the request's current status.
Sara: Android only for the demonstration, or do we need separate native apps?
Bilal: A Flutter app demo is enough. The project deadline is 24 October.
Usman: What about live maps, driver tracking, and payments?
Bilal: Exclude them. This version is customer login, service booking, and booking status. Those other features must not appear as tasks in the current project.
Sara: I'll own Login and profile screens. That is 8 hours, due 12 October.
Sara: The second task is Service booking screens. I'll own that too. I estimate 12 hours, due 17 October.
Hamza: I can build Booking and account APIs for the app. 16 hours, due 16 October.
Usman: I will own Mobile integration and testing. Initially I would put it at 8 hours, due 22 October.
Sara: Can that cover error states and testing? Eight sounds a little tight.
Usman: You're right. Make the final estimate 10 hours. Keep the task deadline at 22 October.
Bilal: Final agreement: Mobile integration and testing, Usman, 10 hours, 22 October. QuickServe still delivers on 24 October.`,

    helpdesk: `Hina: Third project is HelpDeskPro AI Assistant, for client HelpDeskPro Solutions. I am managing it. They want a support assistant that answers questions from a supplied FAQ document and passes unresolved questions to a human team.
Zain: Does the assistant need to send emails or connect to a real ticketing service?
Hina: No external message sending is required. We are building a support proof of concept, not integrating their full support system.
Hina: Agreed. The project deadline is 22 October.
Maryam: I'll own FAQ document processing. I estimate 10 hours, due 13 October.
Zain: I can own Assistant answer generation. 14 hours, due 17 October.
Zain: The next task is Human escalation flow. The estimate is 6 hours, due 18 October.
Hina: For Assistant evaluation and testing, I was initially considering Zain. But Maryam: can you own that instead?
Maryam: Yes, Maryam is the final owner: 8 hours, due 21 October.
Hina: Confirmed: Maryam, 8 hours, 21 October. Final HelpDeskPro deadline stays 22 October.`,
  };

  const handleParse = async () => {
    if (!transcript.trim()) {
      setParseError('Please enter or paste a meeting transcript first.');
      return;
    }

    setParsing(true);
    setParseError(null);
    setSubmitError(null);
    setSuccessResult(null);

    try {
      const res = await fetch('/api/ai/parse-transcript', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ transcript }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to parse transcript');
      }

      const parsedDraft = data.draft;
      setDraft(parsedDraft.project ? parsedDraft : { project: parsedDraft, tasks: parsedDraft.tasks || [] });
      setWarnings(parsedDraft.warnings || []);
      // Generate a fresh UUID idempotency key per draft
      setIdempotencyKey(crypto.randomUUID ? crypto.randomUUID() : `draft-${Date.now()}-${Math.random()}`);
    } catch (err) {
      setParseError(err.message);
    } finally {
      setParsing(false);
    }
  };

  const handleUpdateProjectField = (field, value) => {
    setDraft((prev) => ({
      ...prev,
      project: {
        ...prev.project,
        [field]: value,
      },
    }));
  };

  const handleUpdateTaskField = (index, field, value) => {
    setDraft((prev) => {
      const updatedTasks = [...prev.tasks];
      updatedTasks[index] = {
        ...updatedTasks[index],
        [field]: field === 'estimatedHours' ? parseFloat(value) || 0 : value,
      };
      return {
        ...prev,
        tasks: updatedTasks,
      };
    });
  };

  const handleAddTask = () => {
    const defaultAgent = teamAgents[0] || { id: 'DEV01' };
    setDraft((prev) => ({
      ...prev,
      tasks: [
        ...prev.tasks,
        {
          title: 'New Task',
          description: 'Task description',
          assigneeId: defaultAgent.id,
          deadline: prev.project?.deadline || '2026-10-20',
          estimatedHours: 8,
        },
      ],
    }));
  };

  const handleDeleteTask = (index) => {
    if (draft.tasks.length <= 1) {
      alert('A project must have at least 1 task.');
      return;
    }
    setDraft((prev) => ({
      ...prev,
      tasks: prev.tasks.filter((_, i) => i !== index),
    }));
  };

  const handleConfirmAndCreate = async () => {
    if (!draft || !draft.project) return;

    // Validate client-side before sending
    const p = draft.project;
    if (!p.name || !p.clientName || !p.managerId || !p.deadline) {
      setSubmitError('Project name, client, manager, and deadline are required.');
      return;
    }

    const projDeadlineTime = new Date(p.deadline).getTime();
    if (isNaN(projDeadlineTime)) {
      setSubmitError('Invalid project deadline date format.');
      return;
    }

    for (const t of draft.tasks) {
      if (!t.title || !t.assigneeId || !t.deadline) {
        setSubmitError(`Task '${t.title || 'Untitled'}' has missing fields.`);
        return;
      }
      if (typeof t.estimatedHours !== 'number' || t.estimatedHours <= 0) {
        setSubmitError(`Task '${t.title}' must have estimated hours greater than 0.`);
        return;
      }
      const taskDeadlineTime = new Date(t.deadline).getTime();
      if (isNaN(taskDeadlineTime) || taskDeadlineTime > projDeadlineTime) {
        setSubmitError(`Task '${t.title}' deadline cannot exceed project deadline (${p.deadline}).`);
        return;
      }
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      const payload = {
        idempotencyKey,
        project: {
          name: p.name,
          clientName: p.clientName,
          description: p.description,
          managerId: p.managerId,
          deadline: p.deadline,
          tasks: draft.tasks.map((t) => ({
            title: t.title,
            description: t.description,
            assigneeId: t.assigneeId,
            deadline: t.deadline,
            estimatedHours: t.estimatedHours,
          })),
        },
      };

      const res = await fetch('/api/projects/create-from-transcript', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create project');
      }

      setSuccessResult(data.project);
    } catch (err) {
      setSubmitError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-8 py-8">
      {/* Title */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <span className="material-symbols-outlined text-primary text-[28px]">auto_awesome</span>
          <h1 className="font-display font-bold text-2xl sm:text-3xl text-on-surface tracking-tight">
            AI Meeting to Project Automation
          </h1>
        </div>
        <p className="text-sm text-on-surface-variant">
          Paste client delivery meeting notes or transcript. Gemini AI automatically extracts projects, tasks,
          assigns managers & agents, honors final corrections, and drops rejected features.
        </p>
      </div>

      {/* Preset Buttons */}
      <div className="mb-4">
        <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant block mb-2">
          Load Sample Meeting Transcript:
        </span>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setTranscript(presets.official)}
            className="px-3 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-xs font-semibold text-on-surface border border-outline-variant/40 transition-colors"
          >
            UrbanCart (18→20 Oct, No Payment)
          </button>
          <button
            type="button"
            onClick={() => setTranscript(presets.quickserve)}
            className="px-3 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-xs font-semibold text-on-surface border border-outline-variant/40 transition-colors"
          >
            QuickServe Mobile (8→10h, No Maps)
          </button>
          <button
            type="button"
            onClick={() => setTranscript(presets.helpdesk)}
            className="px-3 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-xs font-semibold text-on-surface border border-outline-variant/40 transition-colors"
          >
            HelpDeskPro AI (Zain→Maryam testing)
          </button>
        </div>
      </div>

      {/* Transcript Input Box */}
      <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 p-5 shadow-sm mb-6">
        <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-2">
          Meeting Transcript or Notes
        </label>
        <textarea
          rows={8}
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          placeholder="Paste meeting transcript here..."
          className="w-full p-4 rounded-xl bg-surface-container-low border border-outline-variant/40 focus:border-primary focus:bg-white focus:outline-none text-sm font-mono leading-relaxed text-on-surface transition-all"
        />

        {parseError && (
          <div className="mt-3 p-3 rounded-xl bg-error-container text-on-error-container text-xs flex items-center gap-2 border border-error/20">
            <span className="material-symbols-outlined text-[18px] text-error">error</span>
            <span>{parseError}</span>
          </div>
        )}

        <div className="mt-4 flex items-center justify-between">
          <span className="text-xs text-on-surface-variant">
            {transcript.length > 0 ? `${transcript.split(/\s+/).length} words ready for AI parsing` : 'Input empty'}
          </span>
          <button
            type="button"
            onClick={handleParse}
            disabled={parsing || !transcript.trim()}
            className="px-6 py-2.5 rounded-xl bg-primary hover:bg-primary-container text-white font-semibold text-sm shadow-md shadow-primary/20 transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            {parsing ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                <span>Synthesizing Transcript...</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[18px]">psychology</span>
                <span>Parse with AI</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Success Notification */}
      {successResult && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 mb-8 text-emerald-900 shadow-sm animate-fade-in">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[24px]">check_circle</span>
            </div>
            <div className="flex-1">
              <h3 className="font-display font-bold text-lg text-emerald-950">
                Project Successfully Created & Saved!
              </h3>
              <p className="text-sm text-emerald-800 mt-1">
                Project <strong>{successResult.name}</strong> with {successResult.tasks?.length || 0} tasks is
                now saved in the SQLite database and available to assigned managers and agents.
              </p>
              <div className="mt-4 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => onProjectCreated && onProjectCreated(successResult.id)}
                  className="px-4 py-2 rounded-lg bg-emerald-700 text-white font-semibold text-xs shadow-sm hover:bg-emerald-800 transition-colors"
                >
                  View Project Details
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDraft(null);
                    setSuccessResult(null);
                    setTranscript('');
                  }}
                  className="px-4 py-2 rounded-lg bg-emerald-100 text-emerald-800 font-semibold text-xs hover:bg-emerald-200 transition-colors"
                >
                  Parse Another Meeting
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AI Draft Review Panel (Editable) */}
      {draft && !successResult && (
        <div className="bg-surface-container-lowest rounded-2xl border border-primary/30 p-6 shadow-lg relative overflow-hidden">
          {/* Ambient AI Glow Accent */}
          <div className="absolute -right-16 -top-16 w-48 h-48 bg-primary/10 rounded-full blur-3xl pointer-events-none"></div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-5 border-b border-outline-variant/30 mb-6">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary-fixed text-on-primary-fixed text-xs font-bold mb-1">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
                AI Generated Draft (Editable Review)
              </div>
              <h2 className="font-display font-bold text-xl text-on-surface">
                Verify Extracted Project & Deliverables
              </h2>
            </div>
            <div className="text-xs text-on-surface-variant font-mono bg-surface-container px-2.5 py-1 rounded-lg">
              Idempotency: {idempotencyKey.slice(0, 8)}...
            </div>
          </div>

          {/* Warnings Banner if any */}
          {warnings.length > 0 && (
            <div className="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex flex-col gap-1">
              <span className="font-bold flex items-center gap-1 text-amber-950">
                <span className="material-symbols-outlined text-[16px]">warning</span>
                AI Parser Warnings:
              </span>
              <ul className="list-disc pl-5 space-y-0.5">
                {warnings.map((w, idx) => (
                  <li key={idx}>{w}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Project Details Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 bg-surface-container-low/50 p-4 rounded-xl border border-outline-variant/30">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1">
                Project Name
              </label>
              <input
                type="text"
                value={draft.project.name || ''}
                onChange={(e) => handleUpdateProjectField('name', e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-surface-container-lowest border border-outline-variant/50 text-sm font-semibold text-on-surface focus:border-primary focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1">
                Client Name
              </label>
              <input
                type="text"
                value={draft.project.clientName || ''}
                onChange={(e) => handleUpdateProjectField('clientName', e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-surface-container-lowest border border-outline-variant/50 text-sm font-semibold text-on-surface focus:border-primary focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1">
                Assigned Manager (Role: MANAGER)
              </label>
              <select
                value={draft.project.managerId || ''}
                onChange={(e) => handleUpdateProjectField('managerId', e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-surface-container-lowest border border-outline-variant/50 text-sm font-semibold text-on-surface focus:border-primary focus:outline-none"
              >
                {teamManagers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.specialization})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1">
                Project Deadline (YYYY-MM-DD)
              </label>
              <input
                type="date"
                value={draft.project.deadline || ''}
                onChange={(e) => handleUpdateProjectField('deadline', e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-surface-container-lowest border border-outline-variant/50 text-sm font-semibold text-on-surface focus:border-primary focus:outline-none"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1">
                Scope Description
              </label>
              <textarea
                rows={2}
                value={draft.project.description || ''}
                onChange={(e) => handleUpdateProjectField('description', e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-surface-container-lowest border border-outline-variant/50 text-sm text-on-surface focus:border-primary focus:outline-none"
              />
            </div>
          </div>

          {/* Tasks Stream */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-display font-bold text-base text-on-surface flex items-center gap-2">
                <span>Deliverable Tasks</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold">
                  {draft.tasks.length} items
                </span>
              </h3>
              <button
                type="button"
                onClick={handleAddTask}
                className="px-3 py-1 rounded-lg bg-surface-container hover:bg-surface-container-high text-xs font-semibold text-primary flex items-center gap-1 transition-colors"
              >
                <span className="material-symbols-outlined text-[16px]">add</span>
                Add Task
              </button>
            </div>

            <div className="space-y-3">
              {draft.tasks.map((task, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl bg-surface-container-lowest border border-outline-variant/30 hover:border-outline-variant transition-all shadow-sm flex flex-col md:flex-row md:items-center gap-4"
                >
                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block text-[10px] font-bold uppercase text-on-surface-variant mb-1">
                        Task Title
                      </label>
                      <input
                        type="text"
                        value={task.title}
                        onChange={(e) => handleUpdateTaskField(idx, 'title', e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-surface-container-low border border-outline-variant/40 text-xs font-semibold text-on-surface focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase text-on-surface-variant mb-1">
                        Assignee (Role: AGENT)
                      </label>
                      <select
                        value={task.assigneeId}
                        onChange={(e) => handleUpdateTaskField(idx, 'assigneeId', e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-surface-container-low border border-outline-variant/40 text-xs text-on-surface focus:outline-none"
                      >
                        {teamAgents.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.name} ({a.specialization})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <label className="block text-[10px] font-bold uppercase text-on-surface-variant mb-1">
                          Deadline
                        </label>
                        <input
                          type="date"
                          value={task.deadline}
                          onChange={(e) => handleUpdateTaskField(idx, 'deadline', e.target.value)}
                          className="w-full px-2 py-1.5 rounded-lg bg-surface-container-low border border-outline-variant/40 text-xs text-on-surface focus:outline-none"
                        />
                      </div>
                      <div className="w-16">
                        <label className="block text-[10px] font-bold uppercase text-on-surface-variant mb-1">
                          Hours
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={task.estimatedHours}
                          onChange={(e) => handleUpdateTaskField(idx, 'estimatedHours', e.target.value)}
                          className="w-full px-2 py-1.5 rounded-lg bg-surface-container-low border border-outline-variant/40 text-xs font-bold text-primary focus:outline-none text-center"
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDeleteTask(idx)}
                    title="Delete task"
                    className="p-1.5 text-on-surface-variant hover:text-error transition-colors self-end md:self-center"
                  >
                    <span className="material-symbols-outlined text-[18px]">delete</span>
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Submission Error */}
          {submitError && (
            <div className="mb-4 p-3 rounded-xl bg-error-container text-on-error-container text-xs flex items-center gap-2 border border-error/20">
              <span className="material-symbols-outlined text-[18px] text-error">error</span>
              <span>{submitError}</span>
            </div>
          )}

          {/* Confirm & Create Button */}
          <div className="flex items-center justify-between pt-4 border-t border-outline-variant/30">
            <span className="text-xs text-on-surface-variant">
              Saved via atomic transaction. Double submissions deduplicated by idempotency key.
            </span>
            <button
              type="button"
              onClick={handleConfirmAndCreate}
              disabled={submitting}
              className="px-6 py-2.5 rounded-xl bg-primary hover:bg-primary-container text-white font-semibold text-sm shadow-md shadow-primary/25 transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {submitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  <span>Saving Project & Tasks...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[18px]">verified</span>
                  <span>Confirm and Create Project</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
