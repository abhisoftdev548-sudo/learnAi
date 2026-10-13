import { useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Award, Calendar, Flame, Target, Trophy, UserRound, Zap } from 'lucide-react';
import { AppLayout } from '../components/layout/AppLayout.jsx';
import { PageContainer, PageHeader, Section, Avatar } from '../components/ui/Layout.jsx';
import { StatCard, ProgressBar } from '../components/ui/StatCard.jsx';
import { EmptyState, ErrorState, LoadingBlock } from '../components/ui/Feedback.jsx';
import { StatusBadge } from '../components/ui/Badge.jsx';
import { ActivityCalendar } from '../components/dashboard/ActivityCalendar.jsx';
import { SkillProgress } from '../components/dashboard/SkillProgress.jsx';
import { AchievementIcon } from '../components/ui/AchievementIcon.jsx';
import Button from '../components/ui/Button.jsx';
import { useApiResource } from '../hooks/useApiResource.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';
import userService from '../services/userService.js';
import { formatDate, formatDuration, formatNumber, formatRelativeTime } from '../lib/format.js';

export function Profile() {
  useDocumentTitle('Profile');
  const { user } = useAuth();

  const statsRequest = useCallback(() => userService.stats(), []);
  const { data: stats, error, loading, refetch } = useApiResource(statsRequest, []);

  const achievementsRequest = useCallback(() => userService.achievements(), []);
  const { data: achievements } = useApiResource(achievementsRequest, []);

  if (loading && !stats) {
    return (
      <AppLayout>
        <PageContainer>
          <LoadingBlock label="Loading your profile…" />
        </PageContainer>
      </AppLayout>
    );
  }

  if (error && !stats) {
    return (
      <AppLayout>
        <PageContainer>
          <ErrorState error={error} onRetry={refetch} />
        </PageContainer>
      </AppLayout>
    );
  }

  const earned = (achievements?.items ?? []).filter((item) => item.earned);
  const recent = stats?.recentSubmissions ?? [];

  return (
    <AppLayout>
      <PageContainer>
        <div className="card overflow-hidden">
          <div className="h-24 bg-gradient-to-r from-brand-500 via-brand-400 to-violet-400" />
          <div className="flex flex-col gap-5 px-6 pb-6 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
              <div className="-mt-10 rounded-full border-4 border-white bg-white">
                <Avatar user={{ ...user, avatar: user?.avatar }} size={84} />
              </div>
              <div className="pb-1">
                <h1 className="text-xl font-semibold text-ink-900">{user?.name}</h1>
                <p className="text-sm text-ink-500">
                  @{user?.username} · joined {formatDate(user?.createdAt)}
                </p>
                {user?.bio ? <p className="mt-1 max-w-xl text-sm text-ink-600">{user.bio}</p> : null}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 pb-1">
              <span className="chip border border-brand-100 bg-brand-50 text-brand-700">
                <Zap className="h-3.5 w-3.5" /> Level {stats?.level ?? 1}
              </span>
              <span className="chip border border-orange-100 bg-orange-50 text-orange-700">
                <Flame className="h-3.5 w-3.5" /> {stats?.currentStreak ?? 0} day streak
              </span>
              <Button to="/settings" variant="secondary" size="sm">
                Edit profile
              </Button>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total XP" value={formatNumber(stats?.xp ?? 0)} icon={Zap} progress={stats?.levelProgress?.progressPercent ?? 0} hint={`${formatNumber(stats?.levelProgress?.xpToNextLevel ?? 0)} XP to level ${(stats?.level ?? 1) + 1}`} />
          <StatCard label="Challenges solved" value={`${stats?.challengesSolved ?? 0}/${stats?.totalChallenges ?? 0}`} icon={Target} accent="emerald" hint={`${stats?.completionPercent ?? 0}% complete`} />
          <StatCard label="Average score" value={stats?.averageScore ?? 0} icon={Trophy} accent="amber" hint={`Best ${stats?.bestScore ?? 0}/100`} />
          <StatCard label="Team rank" value={stats?.rank ? `#${stats.rank}` : '—'} icon={Award} accent="sky" hint={`${stats?.submissions ?? 0} submissions`} />
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
          <div className="space-y-6">
            <Section title="Practice calendar" description="Every day you submitted a solution.">
              <ActivityCalendar days={stats?.calendar?.calendar ?? []} summary={stats?.calendar?.summary} />
            </Section>

            <Section
              title="Recent submissions"
              actions={
                <Button to="/history" variant="ghost" size="sm">
                  View all
                </Button>
              }
            >
              {recent.length ? (
                <ul className="divide-y divide-slate-100">
                  {recent.map((submission) => (
                    <li key={submission.id}>
                      <Link to={`/submissions/${submission.id}`} className="flex flex-wrap items-center gap-3 py-3 transition hover:bg-slate-50">
                        <span
                          className={`flex h-9 w-9 items-center justify-center rounded-lg text-xs font-semibold ${
                            submission.status === 'passed' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                          }`}
                        >
                          {submission.score}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-ink-800">{submission.challenge?.title}</p>
                          <p className="text-xs text-ink-500">
                            {formatRelativeTime(submission.submittedAt)} · attempt {submission.attemptNumber} ·{' '}
                            {submission.timeTakenLabel ?? formatDuration(submission.timeTaken)}
                          </p>
                        </div>
                        <StatusBadge status={submission.status} />
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState icon={Target} title="No submissions yet" description="Your attempts will show up here." action={<Button to="/challenges">Start practising</Button>} />
              )}
            </Section>
          </div>

          <div className="space-y-6">
            <Section title="Skill progress">
              <SkillProgress categories={stats?.categoryProgress ?? []} />
            </Section>

            <Section
              title="Streaks & records"
              actions={
                <Button to="/achievements" variant="ghost" size="sm">
                  Achievements
                </Button>
              }
            >
              <dl className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <dt className="flex items-center gap-2 text-ink-600">
                    <Flame className="h-4 w-4 text-orange-500" /> Current streak
                  </dt>
                  <dd className="font-semibold text-ink-800">{stats?.currentStreak ?? 0} days</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="flex items-center gap-2 text-ink-600">
                    <Flame className="h-4 w-4 text-amber-500" /> Longest streak
                  </dt>
                  <dd className="font-semibold text-ink-800">{stats?.longestStreak ?? 0} days</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="flex items-center gap-2 text-ink-600">
                    <Calendar className="h-4 w-4 text-brand-500" /> Last practice
                  </dt>
                  <dd className="font-semibold text-ink-800">{stats?.lastPracticeDate ? formatRelativeTime(stats.lastPracticeDate) : '—'}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="flex items-center gap-2 text-ink-600">
                    <Target className="h-4 w-4 text-emerald-500" /> Perfect scores
                  </dt>
                  <dd className="font-semibold text-ink-800">{stats?.perfectScores ?? 0}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="flex items-center gap-2 text-ink-600">
                    <UserRound className="h-4 w-4 text-violet-500" /> First-attempt wins
                  </dt>
                  <dd className="font-semibold text-ink-800">{stats?.firstAttemptSuccesses ?? 0}</dd>
                </div>
              </dl>

              <div className="mt-4 border-t border-slate-100 pt-4">
                <div className="flex items-center justify-between text-xs text-ink-500">
                  <span>Catalogue completion</span>
                  <span className="font-semibold text-ink-700">{stats?.completionPercent ?? 0}%</span>
                </div>
                <ProgressBar value={stats?.completionPercent ?? 0} className="mt-2" />
              </div>
            </Section>

            <Section title={`Achievements (${earned.length}/${achievements?.items?.length ?? 0})`}>
              {earned.length ? (
                <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {earned.slice(0, 6).map((achievement) => (
                    <li key={achievement.key} className="flex flex-col items-center gap-2 rounded-xl border border-slate-100 p-3 text-center">
                      <AchievementIcon icon={achievement.icon} tier={achievement.tier} size="sm" />
                      <span className="text-xs font-medium text-ink-700">{achievement.name}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState icon={Award} title="No achievements yet" description="Solve challenges, keep streaks and score 100 to unlock them." />
              )}
            </Section>
          </div>
        </div>
      </PageContainer>
    </AppLayout>
  );
}

export default Profile;
