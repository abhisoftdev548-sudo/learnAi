import { useCallback, useState } from 'react';
import { Award, CheckCircle2, Lock, Sparkles, Zap } from 'lucide-react';
import { AppLayout } from '../components/layout/AppLayout.jsx';
import { PageContainer, PageHeader, Section } from '../components/ui/Layout.jsx';
import { EmptyState, ErrorState, LoadingBlock } from '../components/ui/Feedback.jsx';
import { SegmentedControl } from '../components/ui/Controls.jsx';
import { AchievementIcon } from '../components/ui/AchievementIcon.jsx';
import { ProgressBar } from '../components/ui/StatCard.jsx';
import { useApiResource } from '../hooks/useApiResource.js';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';
import userService from '../services/userService.js';
import { formatDate, formatNumber } from '../lib/format.js';

const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'earned', label: 'Earned' },
  { value: 'locked', label: 'Locked' },
];

export function Achievements() {
  useDocumentTitle('Achievements');
  const request = useCallback(() => userService.achievements(), []);
  const { data, error, loading, refetch } = useApiResource(request, []);
  const [filter, setFilter] = useState('all');

  if (loading && !data) {
    return (
      <AppLayout>
        <PageContainer>
          <LoadingBlock label="Loading achievements…" />
        </PageContainer>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout>
        <PageContainer>
          <ErrorState error={error} onRetry={refetch} />
        </PageContainer>
      </AppLayout>
    );
  }

  const items = (data?.items ?? []).filter((item) => {
    if (filter === 'earned') return item.earned;
    if (filter === 'locked') return !item.earned;
    return true;
  });

  const summary = data?.summary ?? { earned: 0, total: 0, completionPercent: 0, xpFromAchievements: 0 };

  return (
    <AppLayout>
      <PageContainer>
        <PageHeader
          icon={Award}
          title="Achievements"
          description="Milestones unlock automatically as you practise — each one pays a small XP reward."
          actions={<SegmentedControl options={FILTERS} value={filter} onChange={setFilter} />}
        />

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="card p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">Unlocked</p>
            <p className="mt-2 text-2xl font-semibold text-ink-900">
              {summary.earned}
              <span className="text-base font-normal text-ink-400"> / {summary.total}</span>
            </p>
            <ProgressBar value={summary.completionPercent} className="mt-4" />
          </div>
          <div className="card p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">Completion</p>
            <p className="mt-2 text-2xl font-semibold text-ink-900">{summary.completionPercent}%</p>
            <p className="mt-2 text-xs text-ink-500">Keep solving to unlock the rest.</p>
          </div>
          <div className="card p-5">
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-ink-500">
              <Zap className="h-3.5 w-3.5 text-brand-500" /> XP from rewards
            </p>
            <p className="mt-2 text-2xl font-semibold text-ink-900">{formatNumber(summary.xpFromAchievements)}</p>
            <p className="mt-2 text-xs text-ink-500">Bonus XP added on top of challenge XP.</p>
          </div>
        </div>

        <Section className="mt-6" title={`${items.length} achievement${items.length === 1 ? '' : 's'}`}>
          {items.length ? (
            <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {items.map((achievement) => (
                <li
                  key={achievement.key}
                  className={`rounded-2xl border p-4 transition ${achievement.earned ? 'border-brand-100 bg-white' : 'border-slate-200 bg-slate-50/60'}`}
                >
                  <div className="flex items-start gap-3">
                    <AchievementIcon icon={achievement.icon} tier={achievement.tier} earned={achievement.earned} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className={`truncate text-sm font-semibold ${achievement.earned ? 'text-ink-900' : 'text-ink-600'}`}>
                          {achievement.name}
                        </h3>
                        {achievement.earned ? (
                          <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                        ) : (
                          <Lock className="h-3.5 w-3.5 shrink-0 text-ink-400" />
                        )}
                      </div>
                      <p className="mt-1 text-xs leading-relaxed text-ink-500">{achievement.description}</p>
                    </div>
                  </div>

                  <div className="mt-3.5">
                    <div className="mb-1.5 flex items-center justify-between text-[11px] text-ink-500">
                      <span>{achievement.category}</span>
                      <span className="font-medium text-ink-600">
                        {achievement.progress?.value ?? 0} / {achievement.progress?.threshold ?? 1}
                      </span>
                    </div>
                    <ProgressBar
                      value={achievement.progress?.percent ?? 0}
                      barClassName={achievement.earned ? 'bg-emerald-500' : 'bg-brand-400'}
                    />
                  </div>

                  <div className="mt-3 flex items-center justify-between text-[11px] text-ink-500">
                    <span className="flex items-center gap-1">
                      <Sparkles className="h-3 w-3 text-amber-500" /> +{achievement.xpReward ?? 0} XP
                    </span>
                    {achievement.earned ? <span>Earned {formatDate(achievement.earnedAt)}</span> : <span>{achievement.progress?.remaining ?? 0} to go</span>}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon={Award} title="Nothing in this filter" description="Switch filters to see other achievements." />
          )}
        </Section>
      </PageContainer>
    </AppLayout>
  );
}

export default Achievements;
