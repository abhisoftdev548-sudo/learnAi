import { Loader2 } from 'lucide-react';

export function Spinner({ className = '' }) {
  return <Loader2 className={`h-5 w-5 animate-spin ${className}`} />;
}

export function PageLoader({ label = 'Loading…' }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-20 text-slate-500">
      <Spinner className="h-8 w-8 text-primary-500" />
      <p className="text-sm">{label}</p>
    </div>
  );
}

export function InlineLoader() {
  return (
    <span className="inline-flex items-center gap-2 text-sm text-slate-500">
      <Spinner className="h-4 w-4" /> Loading…
    </span>
  );
}

export default Spinner;
