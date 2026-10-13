import { ChevronLeft, ChevronRight, Search, X } from 'lucide-react';

export function TextField({ label, hint, error, icon: Icon, className = '', ...props }) {
  return (
    <label className={`block ${className}`}>
      {label ? <span className="label">{label}</span> : null}
      <span className="relative block">
        {Icon ? <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" /> : null}
        <input className={`input ${Icon ? 'pl-9' : ''}`} {...props} />
      </span>
      {error ? <span className="mt-1 block text-xs text-rose-600">{error}</span> : null}
      {hint && !error ? <span className="mt-1 block text-xs text-ink-500">{hint}</span> : null}
    </label>
  );
}

export function TextArea({ label, hint, error, className = '', rows = 4, ...props }) {
  return (
    <label className={`block ${className}`}>
      {label ? <span className="label">{label}</span> : null}
      <textarea rows={rows} className="input resize-y" {...props} />
      {error ? <span className="mt-1 block text-xs text-rose-600">{error}</span> : null}
      {hint && !error ? <span className="mt-1 block text-xs text-ink-500">{hint}</span> : null}
    </label>
  );
}

export function SelectField({ label, options = [], className = '', hint, ...props }) {
  return (
    <label className={`block ${className}`}>
      {label ? <span className="label">{label}</span> : null}
      <select className="input cursor-pointer pr-8" {...props}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {hint ? <span className="mt-1 block text-xs text-ink-500">{hint}</span> : null}
    </label>
  );
}

export function SearchField({ value, onChange, placeholder = 'Search…', onClear, className = '' }) {
  return (
    <div className={`relative ${className}`}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="input pl-9 pr-9"
        aria-label={placeholder}
      />
      {value ? (
        <button
          type="button"
          onClick={() => (onClear ? onClear() : onChange(''))}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-ink-400 transition hover:bg-slate-100 hover:text-ink-600"
          aria-label="Clear search"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      ) : null}
    </div>
  );
}

export function Toggle({ checked, onChange, label, description, id }) {
  return (
    <label htmlFor={id} className="flex cursor-pointer items-start gap-3">
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative mt-0.5 h-5 w-9 shrink-0 rounded-full transition ${checked ? 'bg-brand-600' : 'bg-slate-300'}`}
      >
        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${checked ? 'left-[1.15rem]' : 'left-0.5'}`} />
      </button>
      <span>
        <span className="block text-sm font-medium text-ink-800">{label}</span>
        {description ? <span className="block text-xs text-ink-500">{description}</span> : null}
      </span>
    </label>
  );
}

/** Segmented control used for leaderboard periods, filters and tabs. */
export function SegmentedControl({ options, value, onChange, size = 'md', className = '' }) {
  return (
    <div className={`inline-flex flex-wrap items-center gap-1 rounded-xl bg-slate-100 p-1 ${className}`} role="tablist">
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option.value)}
            className={`rounded-lg font-medium transition ${size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3.5 py-1.5 text-sm'} ${
              active ? 'bg-white text-brand-700 shadow-sm' : 'text-ink-500 hover:text-ink-700'
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export function FilterChips({ options, value, onChange, className = '' }) {
  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
              active
                ? 'border-brand-200 bg-brand-50 text-brand-700'
                : 'border-slate-200 bg-white text-ink-500 hover:border-brand-200 hover:text-brand-600'
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export function Pagination({ page, pages, total, onChange, className = '' }) {
  if (!pages || pages <= 1) return null;
  return (
    <nav className={`flex items-center justify-between gap-3 ${className}`} aria-label="Pagination">
      <p className="text-xs text-ink-500">
        Page <span className="font-semibold text-ink-700">{page}</span> of {pages}
        {typeof total === 'number' ? ` · ${total} items` : ''}
      </p>
      <div className="flex items-center gap-2">
        <button type="button" className="btn-secondary btn-sm" disabled={page <= 1} onClick={() => onChange(page - 1)}>
          <ChevronLeft className="h-3.5 w-3.5" /> Prev
        </button>
        <button type="button" className="btn-secondary btn-sm" disabled={page >= pages} onClick={() => onChange(page + 1)}>
          Next <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </nav>
  );
}

export default TextField;
