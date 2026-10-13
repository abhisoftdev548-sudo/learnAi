/** Date/number/string formatting helpers shared across the app. */

export function formatDate(value, opts) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...opts,
  });
}

export function formatDateTime(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function timeAgo(value) {
  if (!value) return '';
  const s = Math.floor((Date.now() - new Date(value).getTime()) / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return formatDate(value);
}

/** "2d 4h left" / "overdue" for a deadline. */
export function remainingTime(value) {
  if (!value) return { text: '—', urgent: false, past: false };
  const diff = new Date(value).getTime() - Date.now();
  const past = diff < 0;
  const abs = Math.abs(diff);
  const days = Math.floor(abs / 86400000);
  const hours = Math.floor((abs % 86400000) / 3600000);
  const mins = Math.floor((abs % 3600000) / 60000);
  let text;
  if (days > 0) text = `${days}d ${hours}h`;
  else if (hours > 0) text = `${hours}h ${mins}m`;
  else text = `${mins}m`;
  return {
    text: past ? 'deadline passed' : `${text} left`,
    urgent: !past && abs < 24 * 3600 * 1000,
    past,
  };
}

export function initials(name = '') {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
}

export function truncate(text = '', n = 160) {
  if (text.length <= n) return text;
  return `${text.slice(0, n).trimEnd()}…`;
}

export const CATEGORY_LABELS = {
  coding: 'Coding',
  'web-development': 'Web Development',
  'ai-ml': 'AI / ML',
  design: 'Design',
  communication: 'Communication',
  presentation: 'Presentation',
  research: 'Research',
  'team-activity': 'Team Activity',
  custom: 'Custom',
  'dsa-practice': 'DSA Practice',
  'coding-session': 'Coding Session',
  'ai-workshop': 'AI Workshop',
  'english-speaking': 'English Speaking',
  'group-discussion': 'Group Discussion',
  'project-review': 'Project Review',
  'team-meeting': 'Team Meeting',
  other: 'Other',
};

export const DIFFICULTY_LABELS = { easy: 'Easy', medium: 'Medium', hard: 'Hard' };

export const STATUS_STYLES = {
  // submissions
  submitted: 'bg-sky-50 text-sky-700 ring-sky-600/20',
  under_review: 'bg-indigo-50 text-indigo-700 ring-indigo-600/20',
  needs_changes: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  approved: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  rejected: 'bg-rose-50 text-rose-700 ring-rose-600/20',
  overdue: 'bg-rose-50 text-rose-700 ring-rose-600/20',
  not_submitted: 'bg-slate-100 text-slate-600 ring-slate-500/20',
  active: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  not_started: 'bg-slate-100 text-slate-600 ring-slate-500/20',
  closed: 'bg-slate-100 text-slate-600 ring-slate-500/20',
  draft: 'bg-slate-100 text-slate-600 ring-slate-500/20',
  published: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  archived: 'bg-slate-200 text-slate-600 ring-slate-500/20',
  cancelled: 'bg-rose-50 text-rose-700 ring-rose-600/20',
  completed: 'bg-sky-50 text-sky-700 ring-sky-600/20',
  // accounts
  pending: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  suspended: 'bg-rose-50 text-rose-700 ring-rose-600/20',
  // polls
  scheduled: 'bg-sky-50 text-sky-700 ring-sky-600/20',
  // reports
  open: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  resolved: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  dismissed: 'bg-slate-100 text-slate-600 ring-slate-500/20',
};

export function statusLabel(status) {
  if (!status) return '—';
  return String(status).replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}
