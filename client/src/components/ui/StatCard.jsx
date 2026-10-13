import { TrendingUp } from 'lucide-react';

/**
 * Headline metric tile used across the dashboard, profile and admin views.
 * `progress` (0-100) draws the thin bar underneath.
 */
export function StatCard({ label, value, hint, icon: Icon, accent = 'brand', progress = null, footer = null }) {
  const accents = {
    brand: 'bg-brand-50 text-brand-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    rose: 'bg-rose-50 text-rose-600',
    slate: 'bg-slate-100 text-ink-600',
    sky: 'bg-sky-50 text-sky-600',
  };

  return (
    <div className="card card-hover p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">{label}</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-ink-900">{value}</p>
          {hint ? <p className="mt-1 text-xs text-ink-500">{hint}</p> : null}
        </div>
        {Icon ? (
          <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${accents[accent] ?? accents.brand}`}>
            <Icon className="h-5 w-5" />
          </span>
        ) : null}
      </div>

      {typeof progress === 'number' ? (
        <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-brand-500 transition-all duration-500"
            style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
          />
        </div>
      ) : null}

      {footer ? <div className="mt-3 flex items-center gap-1.5 text-xs text-ink-500">{footer}</div> : null}
    </div>
  );
}

export function ProgressBar({ value = 0, max = 100, className = '', barClassName = 'bg-brand-500', showLabel = false, label = '' }) {
  const percent = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  return (
    <div className={className}>
      {showLabel ? (
        <div className="mb-1 flex items-center justify-between text-xs text-ink-500">
          <span>{label}</span>
          <span className="font-medium text-ink-600">{Math.round(percent)}%</span>
        </div>
      ) : null}
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full transition-all duration-500 ${barClassName}`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

export function TrendHint({ children }) {
  return (
    <span className="inline-flex items-center gap-1 text-emerald-600">
      <TrendingUp className="h-3.5 w-3.5" />
      {children}
    </span>
  );
}

export default StatCard;
