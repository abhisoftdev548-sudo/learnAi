import { CATEGORY_STYLES, DIFFICULTY_STYLES, STATUS_STYLES } from '../../lib/constants.js';

export function Badge({ children, className = '', icon: Icon }) {
  return (
    <span className={`chip ${className}`}>
      {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
      {children}
    </span>
  );
}

export function CategoryBadge({ category, className = '' }) {
  const style = CATEGORY_STYLES[category] ?? { chip: 'bg-slate-100 text-ink-600 border border-slate-200' };
  return <Badge className={`${style.chip} ${className}`}>{style.label ?? category}</Badge>;
}

export function DifficultyBadge({ difficulty, className = '' }) {
  const style = DIFFICULTY_STYLES[difficulty] ?? { chip: 'bg-slate-100 text-ink-600 border border-slate-200' };
  return (
    <Badge className={`${style.chip} ${className}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${style.bar}`} />
      {difficulty}
    </Badge>
  );
}

export function StatusBadge({ status, className = '' }) {
  const style = STATUS_STYLES[status] ?? { label: status ?? '—', chip: 'bg-slate-100 text-ink-600 border border-slate-200' };
  return <Badge className={`${style.chip} ${className}`}>{style.label}</Badge>;
}

export default Badge;
