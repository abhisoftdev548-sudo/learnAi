/** Display helpers — all formatting logic lives here so components stay dumb. */

const DATE_TIME = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

const DATE_ONLY = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

export function formatDateTime(value) {
  if (!value) return '—';
  return DATE_TIME.format(new Date(value));
}

export function formatDate(value) {
  if (!value) return '—';
  return DATE_ONLY.format(new Date(value));
}

export function formatNumber(value) {
  return new Intl.NumberFormat('en-US').format(Number(value) || 0);
}

/** "just now", "4 min ago", "3 days ago", then an absolute date. */
export function formatRelativeTime(value) {
  if (!value) return '—';
  const date = new Date(value);
  const diffSeconds = Math.round((Date.now() - date.getTime()) / 1000);
  if (diffSeconds < 45) return 'just now';
  if (diffSeconds < 90) return '1 min ago';
  const minutes = Math.round(diffSeconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days} ${days === 1 ? 'day' : 'days'} ago`;
  return formatDate(value);
}

/** Seconds → "12m 30s" / "1h 04m". */
export function formatDuration(seconds) {
  const total = Math.max(0, Math.round(Number(seconds) || 0));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const rest = total % 60;
  if (hours > 0) return `${hours}h ${String(minutes).padStart(2, '0')}m`;
  if (minutes > 0) return `${minutes}m ${String(rest).padStart(2, '0')}s`;
  return `${rest}s`;
}

/** Countdown for the workspace timer: "28:41". */
export function formatClock(seconds) {
  const total = Math.max(0, Math.round(Number(seconds) || 0));
  const minutes = Math.floor(total / 60);
  const rest = total % 60;
  return `${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`;
}

export function scoreLabel(score) {
  return `${Math.round(Number(score) || 0)} / 100`;
}

export function pluralize(count, singular, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

export function initials(name = '') {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || '?';
}

export function titleCase(value = '') {
  return String(value)
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

/** Percentage helper that never divides by zero. */
export function percent(value, total) {
  if (!total) return 0;
  return Math.round((value / total) * 100);
}

export function truncate(value = '', max = 140) {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}
