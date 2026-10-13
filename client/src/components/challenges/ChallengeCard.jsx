import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, CircleDashed, Clock, ListChecks, RotateCcw, Zap } from 'lucide-react';
import { CategoryBadge, DifficultyBadge } from '../ui/Badge.jsx';
import { formatRelativeTime } from '../../lib/format.js';

/** Catalogue card: title, badges, XP, completion state and attempt usage. */
export function ChallengeCard({ challenge }) {
  const progress = challenge.progress ?? {};
  const solved = Boolean(progress.solved);
  const attempted = (progress.attemptsUsed ?? 0) > 0;
  const attemptsLeft = Math.max(0, (challenge.maxAttempts ?? 3) - (progress.attemptsUsed ?? 0));

  const state = solved ? 'solved' : attempted ? 'in-progress' : 'new';
  const stateStyles = {
    solved: { chip: 'bg-emerald-50 text-emerald-700 border-emerald-100', icon: CheckCircle2, label: 'Solved' },
    'in-progress': { chip: 'bg-amber-50 text-amber-700 border-amber-100', icon: RotateCcw, label: 'In progress' },
    new: { chip: 'bg-slate-100 text-ink-600 border-slate-200', icon: CircleDashed, label: 'Not started' },
  }[state];
  const StateIcon = stateStyles.icon;

  return (
    <Link
      to={`/challenges/${challenge.slug ?? challenge.id}`}
      className="card card-hover group flex h-full flex-col p-5"
      aria-label={`Open ${challenge.title}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <CategoryBadge category={challenge.category} />
          <DifficultyBadge difficulty={challenge.difficulty} />
        </div>
        <span className={`chip ${stateStyles.chip}`}>
          <StateIcon className="h-3.5 w-3.5" />
          {stateStyles.label}
        </span>
      </div>

      <h3 className="mt-3.5 text-base font-semibold text-ink-900 transition group-hover:text-brand-700">{challenge.title}</h3>
      <p className="mt-1.5 line-clamp-2 flex-1 text-sm text-ink-500">{challenge.description}</p>

      <dl className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-ink-500">
        <div className="flex items-center gap-1.5">
          <Zap className="h-3.5 w-3.5 text-brand-500" />
          <span className="font-semibold text-ink-700">{challenge.xp} XP</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5" />
          {challenge.timeLimit} min
        </div>
        <div className="flex items-center gap-1.5">
          <ListChecks className="h-3.5 w-3.5" />
          {challenge.testCount ?? 0} checks
        </div>
      </dl>

      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3.5 text-xs">
        <div className="text-ink-500">
          {solved ? (
            <span>
              Best score <span className="font-semibold text-emerald-600">{progress.bestScore ?? 0}</span>
              {progress.lastSubmittedAt ? <span className="text-ink-400"> · {formatRelativeTime(progress.lastSubmittedAt)}</span> : null}
            </span>
          ) : attempted ? (
            <span>
              {attemptsLeft} {attemptsLeft === 1 ? 'attempt' : 'attempts'} left · best {progress.bestScore ?? 0}
            </span>
          ) : (
            <span>No attempts yet</span>
          )}
        </div>
        <span className="flex items-center gap-1 font-semibold text-brand-600 opacity-0 transition group-hover:opacity-100">
          Open <ArrowRight className="h-3.5 w-3.5" />
        </span>
      </div>
    </Link>
  );
}

export default ChallengeCard;
