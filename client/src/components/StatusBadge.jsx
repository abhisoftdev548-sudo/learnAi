import { STATUS_STYLES, statusLabel } from '../utils/format';

/** Colored status pill driven by a shared style map. */
export default function StatusBadge({ status, className = '', children }) {
  const style = STATUS_STYLES[status] || 'bg-slate-100 text-slate-600 ring-slate-500/20';
  return (
    <span className={`badge ring-1 ring-inset ${style} ${className}`}>
      {children || statusLabel(status)}
    </span>
  );
}
