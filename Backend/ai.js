// AI layer: prompt, provider call, JSON extraction, draft validation.
const SYSTEM = `You convert meeting transcripts into project-management records for NovaWorks Technologies (Lahore, Asia/Karachi).
The meeting took place on 7 October 2026; every date in it refers to 2026 (e.g. "12 October" -> "2026-10-12").

RULES
1. Use ONLY the final agreed decisions. If a value (estimate, deadline, owner, project delivery date) was changed or corrected later in the meeting, use the final value and ignore the superseded one.
2. Each client engagement is its own project. Project deadline = the final confirmed delivery date. managerId = the directory manager who said they manage it.
3. Create one task per distinct piece of work as agreed. Do not split or merge tasks differently from what was agreed. Do NOT create tasks for anything that was rejected, excluded, deferred to future work, or never assigned.
4. managerId and assigneeId MUST be ids from the supplied directory (match people by name). Never invent people. Clients, end users and external contacts are not NovaWorks employees and can never be managers or assignees.
5. estimatedHours is developer effort in hours as agreed (a number), not calendar days. Do not add management hours.
6. description: concise scope taken from the transcript; for projects include explicit scope boundaries that were stated.
7. If a required value cannot be determined from the transcript, use null for it. Do not guess.
8. Respond with ONLY a JSON object (no markdown, no commentary) of exactly this shape:
{"projects":[{"name":"","clientName":"","description":"","managerId":"","deadline":"YYYY-MM-DD","tasks":[{"title":"","description":"","assigneeId":"","deadline":"YYYY-MM-DD","estimatedHours":0}]}]}`;

function buildUserPrompt(transcript, directory) {
  return `TEAM DIRECTORY (JSON):\n${JSON.stringify(directory)}\n\nTRANSCRIPT:\n"""\n${transcript}\n"""\n\nReturn the JSON now.`;
}

// Directory sent to the AI: no emails, no passwords/hashes.
const toDirectory = (users) => users.map((u) => ({ id: u.id, name: u.name, role: u.role, specialization: u.specialization, skills: u.skills }));

async function post(url, headers, body) {
  const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body), signal: AbortSignal.timeout(120000) });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data?.error?.message || data?.error || `LLM HTTP ${r.status}`);
  return data;
}

async function callLLM({ system, user }) {
  const e = process.env;
  const provider = e.LLM_PROVIDER || (e.GEMINI_API_KEY ? 'gemini' : e.ANTHROPIC_API_KEY ? 'anthropic' : e.OPENAI_API_KEY ? 'openai' : '');
  if (provider === 'gemini') {
    if (!e.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY is not set');
    const model = e.LLM_MODEL || 'gemini-2.0-flash';
    const d = await post(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${e.GEMINI_API_KEY}`, {}, {
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: 'user', parts: [{ text: user }] }],
      generationConfig: { temperature: 0, responseMimeType: 'application/json' },
    });
    return d.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') || '';
  }
  if (provider === 'anthropic') {
    if (!e.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY is not set');
    const d = await post('https://api.anthropic.com/v1/messages', { 'x-api-key': e.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' }, {
      model: e.LLM_MODEL || 'claude-sonnet-5-5', max_tokens: 8000, temperature: 0, system, messages: [{ role: 'user', content: user }],
    });
    return d.content?.filter((b) => b.type === 'text').map((b) => b.text).join('') || '';
  }
  if (provider === 'openai') {
    if (!e.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY is not set');
    const d = await post('https://api.openai.com/v1/chat/completions', { Authorization: `Bearer ${e.OPENAI_API_KEY}` }, {
      model: e.LLM_MODEL || 'gpt-4o-mini', temperature: 0, response_format: { type: 'json_object' },
      messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
    });
    return d.choices?.[0]?.message?.content || '';
  }
  throw new Error('No AI key configured. Set GEMINI_API_KEY, ANTHROPIC_API_KEY or OPENAI_API_KEY in .env');
}

function extractJson(text) {
  let s = String(text || '').replace(/```(?:json)?/gi, '').trim();
  const a = s.indexOf('{'), b = s.lastIndexOf('}');
  if (a < 0 || b <= a) throw new Error('AI did not return JSON');
  return JSON.parse(s.slice(a, b + 1));
}

const isDate = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(Date.parse(s)) && new Date(s).toISOString().slice(0, 10) === s;
const str = (v) => (typeof v === 'string' ? v.trim() : v == null ? '' : String(v).trim());

// Normalises and validates the whole draft. Returns {draft, issues}. Saves nothing.
function validateDraft(raw, users) {
  const issues = [];
  const byId = new Map(users.map((u) => [u.id, u]));
  if (!raw || !Array.isArray(raw.projects) || raw.projects.length === 0) {
    return { draft: { projects: [] }, issues: ['No projects found in the AI output.'] };
  }
  const draft = {
    projects: raw.projects.map((p, i) => {
      const label = `Project ${i + 1}${p?.name ? ` "${p.name}"` : ''}`;
      const proj = {
        name: str(p?.name), clientName: str(p?.clientName), description: str(p?.description),
        managerId: str(p?.managerId), deadline: str(p?.deadline),
        tasks: Array.isArray(p?.tasks) ? p.tasks : [],
      };
      if (!proj.name) issues.push(`${label}: name is missing`);
      if (!proj.clientName) issues.push(`${label}: client is missing`);
      if (byId.get(proj.managerId)?.role !== 'MANAGER') issues.push(`${label}: managerId "${proj.managerId}" is not an existing manager`);
      if (!isDate(proj.deadline)) issues.push(`${label}: deadline "${proj.deadline}" is not a valid YYYY-MM-DD date`);
      if (proj.tasks.length === 0) issues.push(`${label}: has no tasks`);
      proj.tasks = proj.tasks.map((t, j) => {
        const tl = `${label}, task ${j + 1}${t?.title ? ` "${t.title}"` : ''}`;
        const hours = typeof t?.estimatedHours === 'string' ? Number(t.estimatedHours) : t?.estimatedHours;
        const task = { title: str(t?.title), description: str(t?.description), assigneeId: str(t?.assigneeId), deadline: str(t?.deadline), estimatedHours: hours };
        if (!task.title) issues.push(`${tl}: title is missing`);
        if (byId.get(task.assigneeId)?.role !== 'AGENT') issues.push(`${tl}: assigneeId "${task.assigneeId}" is not an existing agent`);
        if (!(typeof hours === 'number' && Number.isFinite(hours) && hours > 0)) issues.push(`${tl}: estimatedHours must be a positive number`);
        if (!isDate(task.deadline)) issues.push(`${tl}: deadline "${task.deadline}" is not a valid YYYY-MM-DD date`);
        else if (isDate(proj.deadline) && task.deadline > proj.deadline) issues.push(`${tl}: deadline ${task.deadline} is after the project deadline ${proj.deadline}`);
        return task;
      });
      return proj;
    }),
  };
  return { draft, issues };
}

module.exports = { SYSTEM, buildUserPrompt, toDirectory, callLLM, extractJson, validateDraft };
