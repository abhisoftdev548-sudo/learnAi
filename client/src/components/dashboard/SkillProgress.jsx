import { Code2 } from 'lucide-react';
import { CATEGORY_STYLES } from '../../lib/constants.js';
import { ProgressBar } from '../ui/StatCard.jsx';
import { EmptyState } from '../ui/Feedback.jsx';

/**
 * Per-category progress (solved / total, average score) as returned by
 * `/api/users/me/progress` and the profile stats.
 */
export function SkillProgress({ categories = [], className = '' }) {
  if (!categories.length) {
    return <EmptyState icon={Code2} title="No categories yet" description="Challenge categories will appear here once the catalogue is seeded." />;
  }

  return (
    <div className={`space-y-5 ${className}`}>
      {categories.map((entry) => {
        const style = CATEGORY_STYLES[entry.category] ?? CATEGORY_STYLES.HTML;
        const solved = entry.solved ?? 0;
        const total = entry.total ?? 0;
        const percent = entry.percent ?? (total ? Math.round((solved / total) * 100) : 0);

        return (
          <div key={entry.category}>
            <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${style.dot}`} />
                <span className="text-sm font-medium text-ink-800">{entry.category}</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-ink-500">
                {typeof entry.averageScore === 'number' ? <span>avg {Math.round(entry.averageScore)}</span> : null}
                <span className="font-semibold text-ink-700">
                  {solved}/{total}
                </span>
                <span>{percent}%</span>
              </div>
            </div>
            <ProgressBar value={percent} barClassName={style.bar} />
            {entry.attempted > solved ? <p className="mt-1 text-[11px] text-ink-400">{entry.attempted - solved} in progress</p> : null}
          </div>
        );
      })}
    </div>
  );
}

export default SkillProgress;
