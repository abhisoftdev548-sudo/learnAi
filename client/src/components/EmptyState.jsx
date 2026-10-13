export default function EmptyState({ icon: Icon, title, body, action, className = '' }) {
  return (
    <div className={`card flex flex-col items-center justify-center gap-2 px-6 py-14 text-center ${className}`}>
      {Icon && (
        <span className="mb-1 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-50 text-primary-600">
          <Icon className="h-6 w-6" />
        </span>
      )}
      <h3 className="text-base font-semibold text-slate-800">{title}</h3>
      {body && <p className="max-w-md text-sm text-slate-500">{body}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
