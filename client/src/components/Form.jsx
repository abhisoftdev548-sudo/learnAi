import { Spinner } from './Spinner';

/** Labeled text input with error support. */
export function Field({ label, error, hint, required, children }) {
  return (
    <div>
      {label && (
        <label className="label">
          {label}
          {required && <span className="ml-0.5 text-rose-500">*</span>}
        </label>
      )}
      {children}
      {hint && !error && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
      {error && <p className="mt-1 text-xs font-medium text-rose-600">{error}</p>}
    </div>
  );
}

export function Input({ error, className = '', ...props }) {
  return <input className={`input ${error ? '!border-rose-400 !ring-rose-500/10' : ''} ${className}`} {...props} />;
}

export function Textarea({ error, className = '', rows = 4, ...props }) {
  return <textarea rows={rows} className={`input resize-y ${error ? '!border-rose-400 !ring-rose-500/10' : ''} ${className}`} {...props} />;
}

export function Select({ error, className = '', children, ...props }) {
  return (
    <select className={`input appearance-none bg-no-repeat pr-8 ${error ? '!border-rose-400' : ''} ${className}`}
      style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2394a3b8' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E\")", backgroundPosition: 'right 0.6rem center', backgroundSize: '1.1em' }}
      {...props}
    >
      {children}
    </select>
  );
}

/** Submit button with integrated busy state. */
export function SubmitButton({ busy, children, className = 'btn-primary w-full', disabled, ...props }) {
  return (
    <button type="submit" className={className} disabled={busy || disabled} {...props}>
      {busy && <Spinner className="h-4 w-4" />}
      {children}
    </button>
  );
}
