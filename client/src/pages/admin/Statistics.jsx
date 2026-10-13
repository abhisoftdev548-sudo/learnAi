import { useCallback, useState } from 'react';
import { BarChart3, Clock, Flame, Layers, Percent, Target, Trophy, Zap } from 'lucide-react';
import { AppLayout } from '../../components/layout/AppLayout.jsx';
import { PageContainer, PageHeader, Section, Avatar } from '../../components/ui/Layout.jsx';
import { StatCard } from '../../components/ui/StatCard.jsx';
import { ErrorState, LoadingBlock } from '../../components/ui/Feedback.jsx';
import { BarChart, DistributionList } from '../../components/admin/Charts.jsx';
import { SegmentedControl } from '../../components/ui/Controls.jsx';
import { CategoryBadge, DifficultyBadge } from '../../components/ui/Badge.jsx';
import Button from '../../components/ui/Button.jsx';
import { useApiResource } from '../../hooks/useApiResource.js';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';
import adminService from '../../services/adminService.js';
import { formatDate, formatNumber } from '../../lib/format.js';

const RANGES = [
  { value: '7', label: '7 days' },
  { value: '30', label: '30 days' },
  { value: '90', label: '90 days' },
];

export function Statistics() {
  useDocumentTitle('Statistics');
  const [days, setDays] = useState('30');

  const request = useCallback(() => adminService.statistics(Number(days)), [days]);
  const { data, error, loading, refetch } = useApiResource(request, [days]);

  if (loading && !data) {
    return (
      <AppLayout>
        <PageContainer>
          <LoadingBlock label="Crunching the numbers…" />
        </PageContainer>
      </AppLayout>
    );
  }

  if (error && !data) {
    return (
      <AppLayout>
        <PageContainer>
          <ErrorState error={error} onRetry={refetch} />
        </PageContainer>
      </AppLayout>
    );
  }

  const activity = data?.activity ?? [];
  const totalSubmissions = activity.reduce((sum, entry) => sum + entry.submissions, 0);
  const totalXp = activity.reduce((sum, entry) => sum + entry.xp, 0);
  const peakDay = activity.reduce((best, entry) => (entry.submissions > (best?.submissions ?? 0) ? entry : best), null);

  return (
    <AppLayout>
      <PageContainer>
        <PageHeader
          icon={BarChart3}
          title="Team statistics"
          description="Practice volume, difficulty mix, distribution and who is carrying the team."
          actions={
            <>
              <SegmentedControl options={RANGES} value={days} onChange={setDays} />
              <Button to="/admin" variant="secondary">
                Admin dashboard
              </Button>
            </>
          }
        >
          {data?.window ? (
            <p className="mt-2 text-xs text-ink-500">
              Window: {formatDate(data.window.from)} → {formatDate(data.window.to)}
            </p>
          ) : null}
        </PageHeader>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Submissions in range" value={formatNumber(totalSubmissions)} icon={Target} hint={`${activity.length} active day(s)`} />
          <StatCard label="XP earned" value={formatNumber(totalXp)} icon={Zap} accent="brand" hint={`Peak day ${peakDay?.date?.slice(5) ?? '—'} · ${peakDay?.submissions ?? 0} submissions`} />
          <StatCard
            label="Average score"
            value={`${activity.length ? Math.round(activity.reduce((sum, entry) => sum + entry.averageScore, 0) / activity.length) : 0}`}
            icon={Trophy}
            accent="amber"
            hint="Across the range"
          />
          <StatCard label="Active members" value={Math.max(0, ...activity.map((entry) => entry.activeUsers ?? 0))} icon={Flame} accent="rose" hint="Peak concurrent practice days" />
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
          <div className="space-y-6">
            <Section title="Practice activity" description="Submissions and XP per day.">
              <BarChart
                data={activity.map((entry) => ({ label: entry.date.slice(5), value: entry.submissions }))}
                barClassName="bg-brand-500"
                height={170}
              />
              <div className="mt-4">
                <BarChart
                  data={activity.map((entry) => ({ label: entry.date.slice(5), value: entry.xp }))}
                  barClassName="bg-emerald-400"
                  height={110}
                  formatValue={(value) => `${value} XP`}
                />
              </div>
            </Section>

            <Section title="Category breakdown" description="Attempts and completion rate per category.">
              <div className="overflow-x-auto">
                <table className="table-base min-w-[36rem]">
                  <thead>
                    <tr>
                      <th>Category</th>
                      <th className="text-right">Challenges</th>
                      <th className="text-right">Attempts</th>
                      <th className="text-right">Passed</th>
                      <th className="text-right">Completion</th>
                      <th className="text-right">Average</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data?.categoryBreakdown ?? []).map((entry) => (
                      <tr key={entry.category}>
                        <td>
                          <CategoryBadge category={entry.category} />
                        </td>
                        <td className="text-right">{entry.challenges}</td>
                        <td className="text-right">{entry.attempts}</td>
                        <td className="text-right">{entry.passedSubmissions}</td>
                        <td className="text-right">
                          <span className="inline-flex items-center gap-1">
                            <Percent className="h-3 w-3 text-ink-400" />
                            {entry.completionRate}
                          </span>
                        </td>
                        <td className="text-right font-medium text-ink-800">{entry.averageScore}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Section>

            <Section title="Hardest challenges" description="Lowest pass rate in the selected window.">
              <ul className="divide-y divide-slate-100">
                {(data?.hardestChallenges ?? []).map((challenge) => (
                  <li key={challenge.challengeId} className="flex flex-wrap items-center gap-3 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink-800">{challenge.title}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <CategoryBadge category={challenge.category} />
                        <DifficultyBadge difficulty={challenge.difficulty} />
                        <span className="text-xs text-ink-500">
                          {challenge.attempts} attempt(s) · avg {challenge.averageScore} · best {challenge.bestScore}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-ink-800">{challenge.passRate}%</p>
                      <p className="text-[11px] text-ink-500">pass rate</p>
                    </div>
                  </li>
                ))}
                {!(data?.hardestChallenges ?? []).length ? <li className="py-6 text-center text-sm text-ink-500">No attempts in this window.</li> : null}
              </ul>
            </Section>
          </div>

          <div className="space-y-6">
            <Section title="Score distribution">
              <DistributionList
                items={(data?.scoreDistribution ?? []).map((bucket) => ({
                  label: `${bucket.bucket} points`,
                  value: bucket.submissions,
                  barClassName: Number(bucket.bucket.split('-')[0]) >= 70 ? 'bg-emerald-500' : 'bg-amber-400',
                }))}
                total={totalSubmissions}
              />
            </Section>

            <Section title="Attempts per submission">
              <DistributionList
                items={(data?.attemptsDistribution ?? []).map((entry) => ({
                  label: `Attempt ${entry.attempt}`,
                  value: entry.submissions,
                }))}
                total={totalSubmissions}
              />
            </Section>

            <Section title="Levels">
              <DistributionList
                items={(data?.levelDistribution ?? []).map((entry) => ({
                  label: `Level ${entry.level}`,
                  value: entry.users,
                  barClassName: 'bg-violet-400',
                }))}
              />
            </Section>

            <Section title="Streaks">
              <DistributionList
                items={(data?.streakDistribution ?? []).map((entry) => ({
                  label: entry.streak === 0 ? 'No streak' : `${entry.streak} day streak`,
                  value: entry.users,
                  barClassName: 'bg-orange-400',
                }))}
              />
            </Section>

            <Section title="Top performers" description="Ranked by XP in the window.">
              <ul className="space-y-2.5">
                {(data?.topPerformers ?? []).map((performer, index) => (
                  <li key={performer.id ?? performer.username} className="flex items-center gap-3">
                    <span className="w-5 text-center text-sm font-semibold text-ink-500">{index + 1}</span>
                    <Avatar user={performer} size={32} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink-800">{performer.name}</p>
                      <p className="truncate text-xs text-ink-500">
                        @{performer.username} · {performer.challengesSolved ?? 0} solved
                      </p>
                    </div>
                    <span className="flex items-center gap-1 text-sm font-semibold text-ink-800">
                      <Zap className="h-3.5 w-3.5 text-brand-500" />
                      {formatNumber(performer.xp ?? 0)}
                    </span>
                  </li>
                ))}
                {!(data?.topPerformers ?? []).length ? <li className="py-6 text-center text-sm text-ink-500">No practice in this window.</li> : null}
              </ul>
            </Section>

            <Section title="Notes">
              <ul className="space-y-2 text-xs text-ink-500">
                <li className="flex items-start gap-2">
                  <Layers className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-400" />
                  All figures are computed from stored submissions — nothing is sampled or estimated.
                </li>
                <li className="flex items-start gap-2">
                  <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-400" />
                  Times are UTC-based, matching the streak logic.
                </li>
                <li className="flex items-start gap-2">
                  <Target className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-400" />
                  Completion rate compares passed submissions with total attempts per category.
                </li>
              </ul>
            </Section>
          </div>
        </div>
      </PageContainer>
    </AppLayout>
  );
}

export default Statistics;
