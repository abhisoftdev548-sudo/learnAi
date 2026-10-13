import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Award,
  BarChart3,
  Braces,
  CheckCircle2,
  Code2,
  FileCode2,
  Flame,
  Layout,
  Palette,
  Play,
  Sparkles,
  Target,
  Trophy,
  Users,
  Wand2,
  Zap,
} from 'lucide-react';
import { AppLayout } from '../components/layout/AppLayout.jsx';
import Button from '../components/ui/Button.jsx';
import { Avatar, PageContainer } from '../components/ui/Layout.jsx';
import { CATEGORY_STYLES } from '../lib/constants.js';
import { formatNumber } from '../lib/format.js';
import { useAuth } from '../context/AuthContext.jsx';
import challengeService from '../services/challengeService.js';
import leaderboardService from '../services/leaderboardService.js';

const CATEGORY_ICONS = { HTML: FileCode2, CSS: Palette, JavaScript: Braces };

const FEATURES = [
  {
    icon: Play,
    title: 'Live sandbox preview',
    description: 'Write HTML, CSS and JavaScript, then run it instantly in an isolated iframe — no build step, no setup.',
  },
  {
    icon: Target,
    title: 'Deterministic scoring',
    description: 'Every submission is graded out of 100 across structure, styling, functionality, responsiveness and code quality.',
  },
  {
    icon: BarChart3,
    title: 'Progress you can see',
    description: 'XP, levels, streaks, per-category mastery and a GitHub-style practice calendar keep momentum visible.',
  },
  {
    icon: Trophy,
    title: 'Team leaderboard',
    description: 'Weekly, monthly and all-time rankings so a little friendly competition keeps the team sharp.',
  },
  {
    icon: Award,
    title: 'Achievements',
    description: 'Milestones unlock automatically as you solve challenges, hit perfect scores and build longer streaks.',
  },
  {
    icon: Wand2,
    title: 'Actionable feedback',
    description: 'Each test reports exactly what passed, what failed and what to fix before your next attempt.',
  },
];

const STEPS = [
  { title: 'Pick a challenge', description: 'Filter the catalogue by category, difficulty or what you have not solved yet.' },
  { title: 'Build it in the workspace', description: 'Use the editor with the live preview and reveal hints only when you need them.' },
  { title: 'Submit and improve', description: 'Read the score breakdown, fix the failing checks and climb the leaderboard.' },
];

export function Landing() {
  const { isAuthenticated } = useAuth();
  const [catalogue, setCatalogue] = useState(null);
  const [leaders, setLeaders] = useState([]);

  useEffect(() => {
    let cancelled = false;
    Promise.allSettled([challengeService.list({ limit: 100 }), leaderboardService.preview()]).then(([challenges, preview]) => {
      if (cancelled) return;
      if (challenges.status === 'fulfilled') setCatalogue(challenges.value.data);
      if (preview.status === 'fulfilled') setLeaders(preview.value.data?.entries ?? []);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const facets = catalogue?.meta?.facets ?? null;
  const totalChallenges = catalogue?.meta?.total ?? catalogue?.data?.length ?? 0;
  const totalXp = catalogue?.data?.reduce((sum, challenge) => sum + (challenge.xp ?? 0), 0) ?? 0;

  return (
    <AppLayout>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-slate-200 bg-white">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-gradient-to-br from-brand-50 via-violet-50 to-white"
          aria-hidden="true"
        />
        <PageContainer className="relative">
          <div className="grid items-center gap-10 py-14 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:py-20">
            <div className="animate-fade-in">
              <span className="chip border border-brand-100 bg-white text-brand-700">
                <Sparkles className="h-3.5 w-3.5" /> Team coding practice
              </span>
              <h1 className="mt-5 text-4xl font-semibold leading-tight tracking-tight text-ink-900 sm:text-5xl">
                Practice. Build. <span className="text-brand-600">Improve.</span>
              </h1>
              <p className="mt-5 max-w-xl text-base leading-relaxed text-ink-600">
                Practice HTML, CSS and JavaScript through real coding challenges, track your progress, and compete with your team.
              </p>

              <div className="mt-7 flex flex-wrap items-center gap-3">
                {isAuthenticated ? (
                  <>
                    <Button to="/dashboard" size="lg" iconRight={ArrowRight}>
                      Go to dashboard
                    </Button>
                    <Button to="/challenges" variant="secondary" size="lg">
                      Browse challenges
                    </Button>
                  </>
                ) : (
                  <>
                    <Button to="/register" size="lg" iconRight={ArrowRight}>
                      Start practising
                    </Button>
                    <Button to="/login" variant="secondary" size="lg">
                      Sign in
                    </Button>
                  </>
                )}
              </div>

              <dl className="mt-9 grid max-w-lg grid-cols-3 gap-4">
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-ink-500">Challenges</dt>
                  <dd className="mt-1 text-2xl font-semibold text-ink-900">{totalChallenges || '—'}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-ink-500">XP available</dt>
                  <dd className="mt-1 text-2xl font-semibold text-ink-900">{totalXp ? formatNumber(totalXp) : '—'}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-ink-500">Graded out of</dt>
                  <dd className="mt-1 text-2xl font-semibold text-ink-900">100</dd>
                </div>
              </dl>
            </div>

            {/* Decorative workspace mock */}
            <div className="animate-fade-in">
              <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-card">
                <div className="flex items-center gap-1.5 border-b border-slate-100 px-2 pb-2.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-rose-300" />
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-300" />
                  <span className="ml-2 text-xs text-ink-400">challenge-workspace</span>
                </div>
                <div className="grid gap-2.5 pt-3 sm:grid-cols-2">
                  <pre className="overflow-hidden rounded-xl bg-ink-900 p-3.5 text-[11px] leading-relaxed text-slate-200">
{`<article class="card">
  <h2>Team update</h2>
  <p>Ship the sprint.</p>
  <button id="go">Open</button>
</article>`}
                  </pre>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
                    <div className="h-3 w-24 rounded bg-brand-200" />
                    <div className="mt-2 h-2 w-full rounded bg-slate-200" />
                    <div className="mt-1.5 h-2 w-2/3 rounded bg-slate-200" />
                    <div className="mt-3 h-7 w-20 rounded-lg bg-brand-500" />
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between rounded-xl border border-emerald-100 bg-emerald-50 px-3.5 py-2.5">
                  <span className="flex items-center gap-2 text-sm font-semibold text-emerald-700">
                    <CheckCircle2 className="h-4 w-4" /> 86 / 100 · 8/10 tests passed
                  </span>
                  <span className="text-xs font-semibold text-emerald-700">+86 XP</span>
                </div>
              </div>
            </div>
          </div>
        </PageContainer>
      </section>

      {/* Categories */}
      <PageContainer>
        <section className="py-14">
          <div className="mb-7 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-ink-900">Practice categories</h2>
              <p className="mt-1 text-sm text-ink-500">Three tracks that mirror how real interfaces are built.</p>
            </div>
            <Link to="/challenges" className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 hover:text-brand-700">
              See all challenges <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Object.entries(CATEGORY_STYLES).map(([category, style]) => {
              const Icon = CATEGORY_ICONS[category] ?? Code2;
              const facet = facets?.categories?.find((item) => item.category === category);
              const preview = (catalogue?.data ?? []).filter((challenge) => challenge.category === category).slice(0, 3);
              return (
                <Link key={category} to={`/challenges?category=${category}`} className="card card-hover p-5">
                  <div className="flex items-center gap-3">
                    <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${style.chip}`}>
                      <Icon className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="font-semibold text-ink-900">{category}</p>
                      <p className="text-xs text-ink-500">{facet ? `${facet.total} challenges` : 'Growing catalogue'}</p>
                    </div>
                  </div>
                  <ul className="mt-4 space-y-1.5">
                    {preview.map((challenge) => (
                      <li key={challenge.id} className="flex items-center justify-between gap-2 text-sm text-ink-600">
                        <span className="truncate">{challenge.title}</span>
                        <span className="shrink-0 text-xs text-ink-400">{challenge.difficulty}</span>
                      </li>
                    ))}
                    {!preview.length ? <li className="text-sm text-ink-400">Challenges will appear here.</li> : null}
                  </ul>
                </Link>
              );
            })}
          </div>
        </section>
      </PageContainer>

      {/* How it works */}
      <section className="border-y border-slate-200 bg-white">
        <PageContainer>
          <div className="py-14">
            <h2 className="text-2xl font-semibold tracking-tight text-ink-900">How it works</h2>
            <p className="mt-1 text-sm text-ink-500">From blank file to a scored submission in three steps.</p>
            <ol className="mt-8 grid gap-5 md:grid-cols-3">
              {STEPS.map((step, index) => (
                <li key={step.title} className="relative rounded-2xl border border-slate-200 bg-slate-50/60 p-5">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-sm font-semibold text-white">
                    {index + 1}
                  </span>
                  <h3 className="mt-4 font-semibold text-ink-900">{step.title}</h3>
                  <p className="mt-1.5 text-sm text-ink-600">{step.description}</p>
                </li>
              ))}
            </ol>
          </div>
        </PageContainer>
      </section>

      {/* Features */}
      <PageContainer>
        <section className="py-14">
          <h2 className="text-2xl font-semibold tracking-tight text-ink-900">Everything a practice platform needs</h2>
          <p className="mt-1 text-sm text-ink-500">Focused features, no busywork.</p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => (
              <div key={feature.title} className="card p-5">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                  <feature.icon className="h-5 w-5" />
                </span>
                <h3 className="mt-4 font-semibold text-ink-900">{feature.title}</h3>
                <p className="mt-1.5 text-sm text-ink-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </section>
      </PageContainer>

      {/* Leaderboard preview + CTA */}
      <section className="border-t border-slate-200 bg-white">
        <PageContainer>
          <div className="grid gap-8 py-14 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
            <div>
              <span className="chip border border-slate-200 bg-slate-50 text-ink-600">
                <Trophy className="h-3.5 w-3.5 text-brand-500" /> Team leaderboard
              </span>
              <h2 className="mt-4 text-2xl font-semibold tracking-tight text-ink-900">Who is on a roll this week?</h2>
              <p className="mt-2 max-w-lg text-sm text-ink-600">
                Ranking is based on XP earned in the selected period, with challenges solved, average score and current streak
                shown for context.
              </p>

              <ul className="mt-6 divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200">
                {leaders.length ? (
                  leaders.slice(0, 5).map((entry) => (
                    <li key={entry.userId ?? entry.username} className="flex items-center gap-3 bg-white px-4 py-3">
                      <span className="w-6 text-center text-sm font-semibold text-ink-500">{entry.rank}</span>
                      <Avatar user={entry} size={34} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-ink-800">{entry.name}</p>
                        <p className="truncate text-xs text-ink-500">@{entry.username}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-ink-800">{formatNumber(entry.xp)} XP</p>
                        <p className="flex items-center justify-end gap-1 text-xs text-ink-500">
                          <Flame className="h-3 w-3 text-orange-500" /> {entry.currentStreak ?? 0}
                        </p>
                      </div>
                    </li>
                  ))
                ) : (
                  <li className="bg-white px-4 py-6 text-center text-sm text-ink-500">
                    Rankings appear once the team starts practising.
                  </li>
                )}
              </ul>

              <div className="mt-5">
                <Button to="/leaderboard" variant="secondary" icon={Users}>
                  View the full leaderboard
                </Button>
              </div>
            </div>

            <div className="rounded-2xl border border-brand-100 bg-gradient-to-br from-brand-50 via-white to-violet-50 p-6 sm:p-8">
              <h2 className="text-2xl font-semibold tracking-tight text-ink-900">Ready to build something?</h2>
              <p className="mt-2 text-sm text-ink-600">
                Create an account, pick a challenge and get an instant score across five quality dimensions. Your team's
                progress is tracked automatically — streaks, achievements and all.
              </p>
              <ul className="mt-5 space-y-2">
                {['No setup — the sandbox runs in your browser', 'Score breakdown after every submission', 'Hints when you need them, none when you do not'].map(
                  (item) => (
                    <li key={item} className="flex items-start gap-2 text-sm text-ink-700">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" />
                      {item}
                    </li>
                  ),
                )}
              </ul>
              <div className="mt-7 flex flex-wrap gap-3">
                <Button to={isAuthenticated ? '/challenges' : '/register'} size="lg" iconRight={ArrowRight}>
                  {isAuthenticated ? 'Browse challenges' : 'Create your account'}
                </Button>
                <Button to={isAuthenticated ? '/leaderboard' : '/login'} variant="secondary" size="lg" icon={Zap}>
                  {isAuthenticated ? 'Leaderboard' : 'I already have an account'}
                </Button>
              </div>
            </div>
          </div>
        </PageContainer>
      </section>

      {/* Accent strip */}
      <div className="border-t border-slate-200 bg-ink-900">
        <PageContainer>
          <div className="flex flex-wrap items-center justify-between gap-4 py-6">
            <p className="flex items-center gap-2 text-sm text-slate-300">
              <Layout className="h-4 w-4 text-brand-400" /> Built for teams that learn by shipping.
            </p>
            <p className="text-xs text-slate-400">HTML · CSS · JavaScript · Graded 0–100</p>
          </div>
        </PageContainer>
      </div>
    </AppLayout>
  );
}

export default Landing;
