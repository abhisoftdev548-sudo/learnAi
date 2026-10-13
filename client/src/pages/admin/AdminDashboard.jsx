import { useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  FileCode2,
  Gauge,
  ShieldCheck,
  Trophy,
  Users,
  Zap,
} from 'lucide-react';
import { AppLayout } from '../../components/layout/AppLayout.jsx';
import { PageContainer, PageHeader, Section, Avatar } from '../../components/ui/Layout.jsx';
import { StatCard } from '../../components/ui/StatCard.jsx';
import { ErrorState, LoadingBlock } from '../../components/ui/Feedback.jsx';
import { BarChart, DistributionList } from '../../components/admin/Charts.jsx';
import { StatusBadge } from '../../components/ui/Badge.jsx';
import Button from '../../components/ui/Button.jsx';
import { useApiResource } from '../../hooks/useApiResource.js';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';
import adminService from '../../services/adminService.js';
import { formatDate, formatDuration, formatNumber, formatRelativeTime } from '../../lib/format.js';

const ADMIN_LINKS = [
  { to: '/admin/challenges', label: 'Manage challenges', icon: FileCode2 },
  { to: '/admin/users', label: 'Manage users', icon: Users },
  { to: '/admin/submissions', label: 'Submissions', icon: Activity },
  { to: '/admin/statistics', label: 'Statistics', icon: BarChart3 },
];

export function AdminDashboard() {
  useDocumentTitle('Admin dashboard');
  const request = useCallback(() => adminService.stats(), []);
  const { data: stats, error, loading, refetch } = useApiResource(request, []);

  if (loading && !stats) {
    return (
      <AppLayout>
        <PageContainer>
          <LoadingBlock label="Loading platform statistics…" />
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

  const users = stats?.users ?? {};
  const challenges = stats?.challenges ?? {};
  const submissions = stats?.submissions ?? {};
  const activeProvider = stats?.execution?.providers?.find((provider) => provider.active);

  return (
    <AppLayout>
      <PageContainer>
        <PageHeader
          icon={ShieldCheck}
          title="Admin dashboard"
          description="Platform-wide health: members, catalogue, submissions and grading pipeline."
          actions={
            <>
              <Button to="/admin/challenges" icon={FileCode2}>
                New challenge
              </Button>
              <Button variant="secondary" to="/admin/statistics" icon={BarChart3}>
                Statistics
              </Button>
            </>
          }
        />

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <StatCard label="Total users" value={formatNumber(users.total ?? 0)} icon={Users} hint={`${users.admins ?? 0} admin(s)`} />
          <StatCard label="Active users" value={formatNumber(users.active ?? 0)} icon={Activity} accent="emerald" hint="Practised recently" />
          <StatCard label="Challenges" value={formatNumber(challenges.total ?? 0)} icon={FileCode2} accent="sky" hint={`${challenges.published ?? 0} published · ${challenges.drafts ?? 0} draft`} />
          <StatCard label="Submissions" value={formatNumber(submissions.total ?? 0)} icon={Gauge} accent="brand" hint={`${submissions.last24h ?? 0} in the last 24h`} />
          <StatCard label="Average score" value={`${submissions.averageScore ?? 0}`} icon={Trophy} accent="amber" hint={`Best ${submissions.bestScore ?? 0} · pass rate ${submissions.passRate ?? 0}%`} />
          <StatCard
            label="Grading pipeline"
            value={activeProvider?.name ?? '—'}
            icon={CheckCircle2}
            accent="emerald"
            hint={`${stats?.execution?.achievements ?? 0} achievements defined`}
          />
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <div className="space-y-6">
            <Section title="Submissions in the last 14 days" description="Daily volume across the whole team.">
              <BarChart
                data={(stats?.dailyActivity ?? []).map((entry) => ({ label: entry.date.slice(5), value: entry.submissions }))}
                barClassName="bg-brand-500"
              />
            </Section>

            <Section
              title="Latest submissions"
              actions={
                <Button to="/admin/submissions" variant="ghost" size="sm">
                  View all
                </Button>
              }
            >
              <ul className="divide-y divide-slate-100">
                {(stats?.recentSubmissions ?? []).map((submission) => (
                  <li key={submission.id} className="flex flex-wrap items-center gap-3 py-3">
                    <span
                      className={`flex h-9 w-9 items-center justify-center rounded-lg text-xs font-semibold ${
                        submission.status === 'passed' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                      }`}
                    >
                      {submission.score}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink-800">{submission.challenge?.title}</p>
                      <p className="truncate text-xs text-ink-500">
                        {submission.user?.name ?? submission.user?.username} · attempt {submission.attemptNumber} ·{' '}
                        {formatRelativeTime(submission.submittedAt)}
                      </p>
                    </div>
                    <span className="text-xs font-semibold text-brand-600">+{submission.xpEarned ?? 0} XP</span>
                    <StatusBadge status={submission.status} />
                  </li>
                ))}
                {!(stats?.recentSubmissions ?? []).length ? <li className="py-6 text-center text-sm text-ink-500">No submissions yet.</li> : null}
              </ul>
            </Section>

            <Section title="Recent members">
              <ul className="grid gap-3 sm:grid-cols-2">
                {(stats?.recentUsers ?? []).map((user) => (
                  <li key={user.id} className="flex items-center gap-3 rounded-xl border border-slate-100 p-3">
                    <Avatar user={user} size={36} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink-800">{user.name}</p>
                      <p className="truncate text-xs text-ink-500">
                        @{user.username} · joined {formatDate(user.createdAt)}
                      </p>
                    </div>
                    <span className="chip border border-slate-200 bg-slate-50 text-ink-600">Lv {user.level ?? 1}</span>
                  </li>
                ))}
              </ul>
            </Section>
          </div>

          <div className="space-y-6">
            <Section title="Popular categories">
              <DistributionList
                items={(stats?.popularCategories ?? []).map((entry) => ({
                  label: `${entry.category} · ${entry.challenges} challenges`,
                  value: entry.attempts,
                  barClassName: entry.category === 'HTML' ? 'bg-orange-400' : entry.category === 'CSS' ? 'bg-sky-400' : 'bg-amber-400',
                }))}
              />
            </Section>

            <Section title="Difficulty mix">
              <DistributionList
                items={(stats?.difficultyDistribution ?? []).map((entry) => ({
                  label: entry.difficulty,
                  value: entry.challenges,
                  barClassName: entry.difficulty === 'Easy' ? 'bg-emerald-500' : entry.difficulty === 'Medium' ? 'bg-amber-500' : 'bg-rose-500',
                }))}
              />
            </Section>

            <Section title="Operations">
              <dl className="space-y-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-ink-500">Average time per submission</dt>
                  <dd className="font-medium text-ink-800">{formatDuration(submissions.averageTime ?? 0)}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-ink-500">Average attempts</dt>
                  <dd className="font-medium text-ink-800">{submissions.averageAttempts ?? 0}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-ink-500">Pass rate</dt>
                  <dd className="font-medium text-ink-800">{submissions.passRate ?? 0}%</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-ink-500">Snapshot taken</dt>
                  <dd className="font-medium text-ink-800">{stats?.generatedAt ? formatRelativeTime(stats.generatedAt) : '—'}</dd>
                </div>
              </dl>

              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-xs text-ink-600">
                <p className="flex items-center gap-1.5 font-semibold text-ink-700">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-500" /> Grading is sandboxed
                </p>
                <p className="mt-1.5 leading-relaxed">
                  Behaviour checks are measured in the member's browser and judged on the server. Structure, styling and quality
                  checks are fully server-side — no user code ever executes inside the API process.
                </p>
              </div>

              <div className="mt-4 grid gap-2">
                {ADMIN_LINKS.map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    className="flex items-center gap-2 rounded-xl border border-slate-100 px-3.5 py-2.5 text-sm font-medium text-ink-700 transition hover:border-brand-200 hover:bg-brand-50/50"
                  >
                    <link.icon className="h-4 w-4 text-brand-500" />
                    {link.label}
                  </Link>
                ))}
              </div>
            </Section>

            <Section title="Team top performers" description="Ranked by XP over the last 30 days.">
              <TopPerformers />
            </Section>
          </div>
        </div>
      </PageContainer>
    </AppLayout>
  );
}

/** Top performers come from the statistics endpoint (kept out of the dashboard payload). */
function TopPerformers() {
  const request = useCallback(() => adminService.statistics(30), []);
  const { data } = useApiResource(request, []);

  const performers = data?.topPerformers ?? [];
  if (!performers.length) return <p className="text-sm text-ink-500">No ranked members yet.</p>;

  return (
    <ul className="space-y-2.5">
      {performers.slice(0, 5).map((performer, index) => (
        <li key={performer.id ?? performer.username} className="flex items-center gap-3">
          <span className="w-5 text-center text-sm font-semibold text-ink-500">{index + 1}</span>
          <Avatar user={performer} size={32} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-ink-800">{performer.name}</p>
            <p className="truncate text-xs text-ink-500">@{performer.username}</p>
          </div>
          <span className="flex items-center gap-1 text-sm font-semibold text-ink-800">
            <Zap className="h-3.5 w-3.5 text-brand-500" />
            {formatNumber(performer.xp ?? 0)}
          </span>
        </li>
      ))}
    </ul>
  );
}

export default AdminDashboard;
