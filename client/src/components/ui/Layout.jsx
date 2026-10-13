import { initials } from '../../lib/format.js';

/** Page shell: consistent max width + vertical rhythm for every route. */
export function PageContainer({ children, className = '' }) {
  return <div className={`mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 ${className}`}>{children}</div>;
}

export function PageHeader({ title, description, actions = null, icon: Icon, children }) {
  return (
    <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex items-start gap-3">
        {Icon ? (
          <span className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
            <Icon className="h-5 w-5" />
          </span>
        ) : null}
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink-900">{title}</h1>
          {description ? <p className="mt-1 max-w-2xl text-sm text-ink-500">{description}</p> : null}
          {children}
        </div>
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}

export function Section({ title, description, actions = null, children, className = '' }) {
  return (
    <section className={`card p-5 sm:p-6 ${className}`}>
      {title || actions ? (
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="section-title">{title}</h2>
            {description ? <p className="mt-0.5 text-sm text-ink-500">{description}</p> : null}
          </div>
          {actions}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function Avatar({ user, size = 40, className = '' }) {
  const src = user?.avatar;
  const dimension = { width: size, height: size };
  if (src) {
    return (
      <img
        src={src}
        alt={`${user?.name ?? 'User'} avatar`}
        style={dimension}
        className={`shrink-0 rounded-full border border-slate-200 object-cover ${className}`}
      />
    );
  }
  return (
    <span
      style={dimension}
      className={`flex shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700 ${className}`}
    >
      {initials(user?.name ?? '')}
    </span>
  );
}

export default PageContainer;
