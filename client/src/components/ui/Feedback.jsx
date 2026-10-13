import { AlertTriangle, Inbox, Loader2, RefreshCw } from 'lucide-react';
import Button from './Button.jsx';

export function Spinner({ className = 'h-5 w-5' }) {
  return <Loader2 className={`animate-spin text-brand-500 ${className}`} aria-hidden="true" />;
}

/** Block-level loading state used while a page or panel is fetching. */
export function LoadingBlock({ label = 'Loading…', className = '' }) {
  return (
    <div className={`flex flex-col items-center justify-center gap-3 py-14 text-center ${className}`}>
      <Spinner className="h-6 w-6" />
      <p className="text-sm text-ink-500">{label}</p>
    </div>
  );
}

/** Skeleton rows keep layout stable while tables load. */
export function SkeletonRows({ rows = 5, className = '' }) {
  return (
    <div className={`space-y-3 ${className}`} aria-hidden="true">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="h-12 animate-pulse rounded-xl bg-slate-100" />
      ))}
    </div>
  );
}

export function EmptyState({ title, description, icon: Icon = Inbox, action = null, className = '' }) {
  return (
    <div className={`flex flex-col items-center justify-center gap-3 px-6 py-14 text-center ${className}`}>
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-ink-500">
        <Icon className="h-5 w-5" />
      </span>
      <div>
        <p className="font-semibold text-ink-800">{title}</p>
        {description ? <p className="mt-1 max-w-md text-sm text-ink-500">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function ErrorState({ error, onRetry, className = '' }) {
  const message = error?.message ?? 'Something went wrong.';
  const offline = error?.status === 0;
  return (
    <div className={`flex flex-col items-center justify-center gap-3 px-6 py-12 text-center ${className}`}>
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-rose-600">
        <AlertTriangle className="h-5 w-5" />
      </span>
      <div>
        <p className="font-semibold text-ink-800">{offline ? 'Server unreachable' : 'Could not load this view'}</p>
        <p className="mt-1 max-w-md text-sm text-ink-500">{message}</p>
      </div>
      {onRetry ? (
        <Button variant="secondary" size="sm" icon={RefreshCw} onClick={() => onRetry()}>
          Try again
        </Button>
      ) : null}
    </div>
  );
}

export default LoadingBlock;
