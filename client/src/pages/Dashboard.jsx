import { useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Award,
  CheckCircle2,
  ChevronRight,
  Flame,
  LayoutDashboard,
  Play,
  Sparkles,
  Target,
  Trophy,
  Zap,
} from 'lucide-react';
import { AppLayout } from '../components/layout/AppLayout.jsx';
import { PageContainer, PageHeader, Section, Avatar } from '../components/ui/Layout.jsx';
import { StatCard, ProgressBar } from '../components/ui/StatCard.jsx';
import { EmptyState, ErrorState, LoadingBlock } from '../components/ui/Feedback.jsx';
import { CategoryBadge, DifficultyBadge, StatusBadge } from '../components/ui/Badge.jsx';
import { ActivityCalendar } from '../components/dashboard/ActivityCalendar.jsx';
import { SkillProgress } from '../components/dashboard/SkillProgress.jsx';
import Button from '../components/ui/Button.jsx';
import { useApiResource } from '../hooks/useApiResource.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';
import userService from '../services/userService.js';
import leaderboardService from '../services/leaderboardService.js';
import { formatNumber, formatRelativeTime } from '../lib/format.js';

function StreakBanner({ stats }) {
  const streak = stats?.currentStreak ?? 0;
  const practicedToday = stats?.practicedToday;

  if (streak > 0 && practicedToday) {
    return (
      <span className="chip border border-emerald-100 bg-emerald-50 text-emerald-700">
        <CheckCircle2 className="h-3.5 w-3.5" /> Practised today
      </span>
    );
  }
  if (streak > 0) {
    return (
      <span className="chip border border-amber-100 bg-amber-50 text-amber-700">
        <Flame className="h-3.5 w-3.5" /> Keep your {streak}-day streak alive
      </span>
    );
  }
  return (
    <span className="chip border border-slate-200 bg-slate-50 text-ink-600">
      <Sparkles className="h-3.5 w-3.5" /> Start a new streak today
    </span>
  );
}

export function Dashboard() {
  useDocumentTitle('Dashboard');
  const { user } = useAuth();

  const statsRequest = useCallback(() => userService.stats(), []);
  const { data: stats, error, loading, refetch } = useApiResource(statsRequest, []);

  const leadersRequest = useCallback(() => leaderboardService.get('weekly', 5), []);
  const { data: leaders } = useApiResource(leadersRequest, []);

  if (loading && !stats) {
    return (
      <AppLayout>
        <PageContainer>
          <LoadingBlock label="Building your dashboard…" />
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

  const level = stats?.levelProgress ?? { level: stats?.level ?? 1, progressPercent: 0, xpToNextLevel: 0 };
  const recommended = stats?.recommendedChallenge;
  const firstName = user?.name?.split(' ')[0] ?? 'developer';

  return (
    <AppLayout>
      <PageContainer>
        <PageHeader
          icon={LayoutDashboard}
          title={`Welcome back, ${firstName}`}
          description="Your practice snapshot — XP, streak, categories and what to build next."
          actions={
            <>
              <StreakBanner stats={stats} />
              <Button to="/challenges" icon={Play}>
                Practice now
              </Button>
            </>
          }
        />

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <StatCard
            label="Total XP"
            value={formatNumber(stats?.xp ?? 0)}
            icon={Zap}
            hint={`Level ${level.level ?? 1}`}
            progress={level.progressPercent ?? 0}
            footer={<span>{formatNumber(level.xpToNextLevel ?? 0)} XP to level {(level.level ?? 1) + 1}</span>}
          />
          <StatCard
            label="Challenges solved"
            value={`${stats?.challengesSolved ?? 0}/${stats?.totalChallenges ?? 0}`}
            icon={Target}
            accent="emerald"
            progress={stats?.completionPercent ?? 0}
            hint={`${stats?.completionPercent ?? 0}% of the catalogue`}
          />
          <StatCard
            label="Average score"
            value={`${stats?.averageScore ?? 0}`}
            icon={Trophy}
            accent="amber"
            hint={`Best ${stats?.bestScore ?? 0}/100`}
          />
          <StatCard
            label="Current streak"
            value={`${stats?.currentStreak ?? 0} ${stats?.currentStreak === 1 ? 'day' : 'days'}`}
            icon={Flame}
            accent="rose"
            hint={`Longest ${stats?.longestStreak ?? 0} days`}
          />
          <StatCard
            label="Team rank"
            value={stats?.rank ? `#${stats.rank}` : '—'}
            icon={Trophy}
            accent="sky"
            hint={`${stats?.submissions ?? 0} submissions logged`}
          />
          <StatCard
            label="Achievements"
            value={stats?.achievements?.earned ?? 0}
            icon={Award}
            accent="brand"
            progress={stats?.achievements?.earned ? Math.round((stats.achievements.earned / 12) * 100) : 0}
            hint="Unlocked so far"
          />
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
          <div className="space-y-6">
            {/* Recommended challenge */}
            <Section
              title="Recommended next challenge"
              description="Picked to close the biggest gap in your progress."
              actions={
                <Button to="/challenges" variant="ghost" size="sm" iconRight={ChevronRight}>
                  All challenges
                </Button>
              }
            >
              {recommended ? (
                <div className="flex flex-col gap-4 rounded-xl border border-brand-100 bg-gradient-to-br from-brand-50/70 to-white p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <CategoryBadge category={recommended.category} />
                      <DifficultyBadge difficulty={recommended.difficulty} />
                      <span className="chip border border-brand-100 bg-white text-brand-700">
                        <Zap className="h-3.5 w-3.5" /> {recommended.xp} XP
                      </span>
                    </div>
                    <h3 className="mt-3 text-base font-semibold text-ink-900">{recommended.title}</h3>
                    <p className="mt-1 text-sm text-ink-600">
                      {recommended.progress?.attemptsUsed
                        ? `${recommended.progress.attemptsUsed} attempt(s) so far · best ${recommended.progress.bestScore ?? 0}/100`
                        : 'You have not attempted this one yet.'}
                    </p>
                  </div>
                  <Button to={`/challenges/${recommended.slug}`} icon={Play} className="shrink-0">
                    Start challenge
                  </Button>
                </div>
              ) : (
                <EmptyState
                  icon={CheckCircle2}
                  title="Every challenge is solved"
                  description="You have completed the whole catalogue — revisit one for a better score or wait for new challenges."
                  action={<Button to="/challenges" variant="secondary">Review challenges</Button>}
                />
              )}
            </Section>

            {/* Activity calendar */}
            <Section title="Practice activity" description="Every submission in the last six months.">
              <ActivityCalendar days={stats?.calendar?.calendar ?? []} summary={stats?.calendar?.summary} />
            </Section>

            {/* Recent submissions */}
            <Section
              title="Recent submissions"
              actions={
                <Button to="/history" variant="ghost" size="sm" iconRight={ChevronRight}>
                  Full history
                </Button>
              }
            >
              {(stats?.recentSubmissions ?? []).length ? (
                <ul className="divide-y divide-slate-100">
                  {stats.recentSubmissions.map((submission) => (
                    <li key={submission.id}>
                      <Link
                        to={`/submissions/${submission.id}`}
                        className="flex flex-wrap items-center gap-3 py-3 transition hover:bg-slate-50"
                      >
                        <span
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-semibold ${
                            submission.status === 'passed' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                          }`}
                        >
                          {submission.score}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-ink-800">{submission.challenge?.title}</p>
                          <p className="truncate text-xs text-ink-500">
                            {submission.challenge?.category} · attempt {submission.attemptNumber} ·{' '}
                            {formatRelativeTime(submission.submittedAt)}
                          </p>
                        </div>
                        <StatusBadge status={submission.status} />
                        <span className="text-xs font-semibold text-brand-600">+{submission.xpEarned} XP</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState
                  icon={Play}
                  title="No submissions yet"
                  description="Pick a challenge and submit your first solution to see it here."
                  action={<Button to="/challenges">Browse challenges</Button>}
                />
              )}
            </Section>
          </div>

          <div className="space-y-6">
            <Section title="Skill progress" description="Solved challenges per category.">
              <SkillProgress categories={stats?.categoryProgress ?? []} />
            </Section>

            <Section
              title="Team leaderboard"
              description="Top performers this week."
              actions={
                <Button to="/leaderboard" variant="ghost" size="sm" iconRight={ChevronRight}>
                  Open
                </Button>
              }
            >
              <ul className="space-y-2.5">
                {(leaders?.entries ?? []).map((entry) => (
                  <li
                    key={entry.userId ?? entry.username}
                    className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 ${
                      entry.isCurrentUser ? 'border-brand-200 bg-brand-50/60' : 'border-slate-100 bg-white'
                    }`}
                  >
                    <span className="w-5 text-center text-sm font-semibold text-ink-500">{entry.rank}</span>
                    <Avatar user={entry} size={32} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink-800">{entry.name}</p>
                      <p className="truncate text-xs text-ink-500">
                        {entry.challengesSolved} solved · avg {entry.averageScore}
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-ink-800">{formatNumber(entry.xp)} XP</span>
                  </li>
                ))}
                {!(leaders?.entries ?? []).length ? (
                  <li className="py-6 text-center text-sm text-ink-500">No practice recorded this week yet.</li>
                ) : null}
              </ul>

              <div className="mt-4 border-t border-slate-100 pt-4">
                <div className="flex items-center justify-between text-xs text-ink-500">
                  <span>Your best score</span>
                  <span className="font-semibold text-ink-700">{stats?.bestScore ?? 0}/100</span>
                </div>
                <ProgressBar value={stats?.bestScore ?? 0} className="mt-2" barClassName="bg-emerald-500" />
                <div className="mt-4 flex items-center justify-between text-xs text-ink-500">
                  <span>Perfect submissions</span>
                  <span className="font-semibold text-ink-700">{stats?.perfectScores ?? 0}</span>
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-ink-500">
                  <span>First-attempt wins</span>
                  <span className="font-semibold text-ink-700">{stats?.firstAttemptSuccesses ?? 0}</span>
                </div>
              </div>
            </Section>

            <Section title="Next steps">
              <ul className="space-y-2.5 text-sm">
                <li>
                  <Link to="/achievements" className="flex items-center justify-between rounded-xl border border-slate-100 px-3.5 py-3 transition hover:border-brand-200 hover:bg-brand-50/50">
                    <span className="flex items-center gap-2 text-ink-700">
                      <Award className="h-4 w-4 text-amber-500" /> Track achievements
                    </span>
                    <ArrowRight className="h-4 w-4 text-ink-400" />
                  </Link>
                </li>
                <li>
                  <Link to="/profile" className="flex items-center justify-between rounded-xl border border-slate-100 px-3.5 py-3 transition hover:border-brand-200 hover:bg-brand-50/50">
                    <span className="flex items-center gap-2 text-ink-700">
                      <Trophy className="h-4 w-4 text-brand-500" /> View public profile
                    </span>
                    <ArrowRight className="h-4 w-4 text-ink-400" />
                  </Link>
                </li>
                <li>
                  <Link to="/settings" className="flex items-center justify-between rounded-xl border border-slate-100 px-3.5 py-3 transition hover:border-brand-200 hover:bg-brand-50/50">
                    <span className="flex items-center gap-2 text-ink-700">
                      <Sparkles className="h-4 w-4 text-violet-500" /> Editor preferences
                    </span>
                    <ArrowRight className="h-4 w-4 text-ink-400" />
                  </Link>
                </li>
              </ul>
            </Section>
          </div>
        </div>
      </PageContainer>
    </AppLayout>
  );
}

export default Dashboard;
