import { Crown, Flame, Medal } from 'lucide-react';
import { Avatar } from '../ui/Layout.jsx';
import { formatNumber } from '../../lib/format.js';

const RANK_STYLES = {
  1: { icon: Crown, className: 'text-amber-500', bg: 'bg-amber-50' },
  2: { icon: Medal, className: 'text-slate-400', bg: 'bg-slate-50' },
  3: { icon: Medal, className: 'text-orange-500', bg: 'bg-orange-50' },
};

/** Team leaderboard: rank, user, XP, challenges, average score and streak. */
export function LeaderboardTable({ entries = [], showPeriodXp = false, emptyLabel = 'No practice recorded for this period yet.' }) {
  if (!entries.length) {
    return <p className="px-4 py-10 text-center text-sm text-ink-500">{emptyLabel}</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="table-base min-w-[46rem]">
        <thead>
          <tr>
            <th className="w-16">Rank</th>
            <th>Member</th>
            <th className="text-right">{showPeriodXp ? 'XP (period)' : 'XP'}</th>
            <th className="text-right">Challenges</th>
            <th className="text-right">Average</th>
            <th className="text-right">Streak</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => {
            const rankStyle = RANK_STYLES[entry.rank];
            return (
              <tr key={entry.userId ?? entry.username} className={entry.isCurrentUser ? 'bg-brand-50/60' : undefined}>
                <td>
                  <span className="inline-flex items-center gap-1.5 font-semibold text-ink-700">
                    {rankStyle ? (
                      <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${rankStyle.bg}`}>
                        <rankStyle.icon className={`h-3.5 w-3.5 ${rankStyle.className}`} />
                      </span>
                    ) : (
                      <span className="w-7 text-center text-sm text-ink-500">{entry.rank}</span>
                    )}
                  </span>
                </td>
                <td>
                  <div className="flex items-center gap-3">
                    <Avatar user={entry} size={34} />
                    <div className="min-w-0">
                      <p className="truncate font-medium text-ink-800">
                        {entry.name}
                        {entry.isCurrentUser ? <span className="ml-2 chip bg-brand-100 text-brand-700">You</span> : null}
                      </p>
                      <p className="truncate text-xs text-ink-500">
                        @{entry.username} · Lv {entry.level ?? 1}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="text-right font-semibold text-ink-800">
                  {formatNumber(entry.xp)}
                  {showPeriodXp && entry.lifetimeXp ? (
                    <span className="block text-[11px] font-normal text-ink-400">{formatNumber(entry.lifetimeXp)} lifetime</span>
                  ) : null}
                </td>
                <td className="text-right">{entry.challengesSolved}</td>
                <td className="text-right">{entry.averageScore ? `${entry.averageScore} / 100` : '—'}</td>
                <td className="text-right">
                  <span className={`inline-flex items-center gap-1 ${entry.currentStreak > 0 ? 'text-orange-600' : 'text-ink-400'}`}>
                    <Flame className="h-3.5 w-3.5" />
                    {entry.currentStreak ?? 0}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default LeaderboardTable;
