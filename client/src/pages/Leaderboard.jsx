import { useCallback, useState } from 'react';
import { Flame, Medal, Trophy } from 'lucide-react';
import { AppLayout } from '../components/layout/AppLayout.jsx';
import { PageContainer, PageHeader } from '../components/ui/Layout.jsx';
import { Section, Avatar } from '../components/ui/Layout.jsx';
import { SegmentedControl } from '../components/ui/Controls.jsx';
import { ErrorState, LoadingBlock, SkeletonRows } from '../components/ui/Feedback.jsx';
import { LeaderboardTable } from '../components/leaderboard/LeaderboardTable.jsx';
import { StatCard } from '../components/ui/StatCard.jsx';
import { useApiResource } from '../hooks/useApiResource.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';
import leaderboardService from '../services/leaderboardService.js';
import { LEADERBOARD_PERIODS } from '../lib/constants.js';
import { formatDate, formatNumber } from '../lib/format.js';

export function Leaderboard() {
  useDocumentTitle('Leaderboard');
  const { isAuthenticated } = useAuth();
  const [period, setPeriod] = useState('weekly');

  const request = useCallback(() => leaderboardService.get(period, 25), [period]);
  const { data: entries, meta, error, loading, refetch } = useApiResource(request, [period]);

  const rows = entries ?? [];
  const me = meta?.me ?? null;
  const podium = rows.slice(0, 3);

  return (
    <AppLayout>
      <PageContainer>
        <PageHeader
          icon={Trophy}
          title="Team leaderboard"
          description="XP earned in the selected period, with challenges solved, average score and streaks for context."
          actions={<SegmentedControl options={LEADERBOARD_PERIODS} value={period} onChange={setPeriod} />}
        />

        {loading && !entries ? (
          <LoadingBlock label="Ranking the team…" />
        ) : error ? (
          <ErrorState error={error} onRetry={refetch} />
        ) : (
          <>
            <div className="grid gap-4 lg:grid-cols-4">
              {podium.map((entry, index) => (
                <div
                  key={entry.userId ?? entry.username}
                  className={`card p-5 ${index === 0 ? 'border-amber-200 bg-gradient-to-br from-amber-50/80 to-white' : ''}`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`flex h-9 w-9 items-center justify-center rounded-xl text-sm font-bold ${
                        index === 0 ? 'bg-amber-100 text-amber-700' : index === 1 ? 'bg-slate-100 text-ink-600' : 'bg-orange-100 text-orange-700'
                      }`}
                    >
                      {entry.rank}
                    </span>
                    <Avatar user={entry} size={38} />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-ink-900">{entry.name}</p>
                      <p className="truncate text-xs text-ink-500">@{entry.username}</p>
                    </div>
                  </div>
                  <dl className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
                    <div>
                      <dt className="text-ink-500">XP</dt>
                      <dd className="mt-0.5 font-semibold text-ink-800">{formatNumber(entry.xp)}</dd>
                    </div>
                    <div>
                      <dt className="text-ink-500">Solved</dt>
                      <dd className="mt-0.5 font-semibold text-ink-800">{entry.challengesSolved}</dd>
                    </div>
                    <div>
                      <dt className="text-ink-500">Streak</dt>
                      <dd className="mt-0.5 inline-flex items-center gap-1 font-semibold text-orange-600">
                        <Flame className="h-3 w-3" /> {entry.currentStreak ?? 0}
                      </dd>
                    </div>
                  </dl>
                </div>
              ))}

              {me ? (
                <StatCard
                  label="Your position"
                  value={`#${me.rank}`}
                  icon={Medal}
                  accent="brand"
                  hint={`${formatNumber(me.xp)} XP · ${me.challengesSolved} solved`}
                />
              ) : null}
            </div>

            <Section
              className="mt-6"
              title={LEADERBOARD_PERIODS.find((option) => option.value === period)?.label ?? 'Rankings'}
              description={
                meta?.window?.from
                  ? `Window: ${formatDate(meta.window.from)} → ${formatDate(meta.window.to)}`
                  : isAuthenticated
                    ? 'All-time ranking based on lifetime XP.'
                    : 'Sign in to see your own position.'
              }
            >
              {loading ? <SkeletonRows rows={6} /> : <LeaderboardTable entries={rows} showPeriodXp={period !== 'all-time'} />}
            </Section>
          </>
        )}
      </PageContainer>
    </AppLayout>
  );
}

export default Leaderboard;
