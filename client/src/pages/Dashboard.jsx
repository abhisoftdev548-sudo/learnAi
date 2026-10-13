import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Users, Target, CalendarDays, CheckCircle2, Coins, Trophy,
  Clock, ArrowRight, Activity, Inbox, MessageSquare, Bell,
} from 'lucide-react';
import api, { apiError } from '../services/api';
import { useAuth } from '../context/AuthContext';
import StatCard from '../components/StatCard';
import StatusBadge from '../components/StatusBadge';
import Avatar from '../components/Avatar';
import { PageLoader } from '../components/Spinner';
import EmptyState from '../components/EmptyState';
import { formatDateTime, remainingTime, timeAgo, truncate, CATEGORY_LABELS, DIFFICULTY_LABELS } from '../utils/format';

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    api.get('/users/dashboard')
      .then((r) => alive && setData(r.data.data))
      .catch((e) => alive && setError(apiError(e)));
    return () => { alive = false; };
  }, []);

  if (error) return <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>;
  if (!data) return <PageLoader label="Loading your dashboard…" />;

  const { cards, upcomingDeadlines, upcomingEventsList, recentChallenges, recentActivity, recentReviews, personalActivity, leaderboardTop } = data;
  const firstName = user?.name?.split(' ')[0];

  return (
    <div className="space-y-6 animate-fadeUp">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Welcome back, {firstName} 👋</h1>
        <p className="mt-1 text-sm text-slate-500">Here’s what’s happening across the team right now.</p>
      </div>

      {/* Overview cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard icon={Users} tone="sky" label="Approved members" value={cards.totalApprovedMembers} />
        <StatCard icon={Target} tone="primary" label="Active challenges" value={cards.activeChallenges} hint="open for submissions" />
        <StatCard icon={CalendarDays} tone="violet" label="Upcoming events" value={cards.upcomingEvents} />
        <StatCard icon={CheckCircle2} tone="emerald" label="My completed challenges" value={cards.myCompletedChallenges} />
        <StatCard icon={Coins} tone="amber" label="My total points" value={cards.myPoints} hint={`${personalActivity.submissions} submissions so far`} />
        <StatCard icon={Trophy} tone="rose" label="My leaderboard position" value={cards.myRank ? `#${cards.myRank}` : '—'} hint="all time" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Deadlines */}
        <section className="card p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
              <Clock className="h-4 w-4 text-primary-500" /> Upcoming deadlines
            </h2>
            <Link to="/challenges" className="text-sm font-semibold text-primary-600 hover:text-primary-700">All challenges</Link>
          </div>
          {upcomingDeadlines.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-400">No open deadlines — check back soon.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {upcomingDeadlines.map((c) => {
                const rem = remainingTime(c.deadline);
                return (
                  <li key={c._id}>
                    <Link to={`/challenges/${c._id}`} className="flex items-center gap-4 py-3 transition hover:bg-slate-50/70">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-slate-800">{c.title}</p>
                        <p className="mt-0.5 text-xs text-slate-400">
                          {CATEGORY_LABELS[c.category] || c.category} · {DIFFICULTY_LABELS[c.difficulty] || c.difficulty} · {c.maxPoints} pts
                        </p>
                      </div>
                      <span className={`badge ring-1 ring-inset whitespace-nowrap ${rem.urgent ? 'bg-rose-50 text-rose-600 ring-rose-600/20' : 'bg-slate-100 text-slate-600 ring-slate-500/20'}`}>
                        {rem.text}
                      </span>
                      <ArrowRight className="h-4 w-4 shrink-0 text-slate-300" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Events */}
        <section className="card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
              <CalendarDays className="h-4 w-4 text-violet-500" /> Upcoming events
            </h2>
            <Link to="/events" className="text-sm font-semibold text-primary-600 hover:text-primary-700">All</Link>
          </div>
          {upcomingEventsList.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-400">No events scheduled.</p>
          ) : (
            <ul className="space-y-3">
              {upcomingEventsList.map((e) => (
                <li key={e._id}>
                  <Link to={`/events/${e._id}`} className="block rounded-xl border border-slate-100 p-3 transition hover:border-primary-200 hover:bg-primary-50/40">
                    <p className="truncate text-sm font-semibold text-slate-800">{e.title}</p>
                    <p className="mt-1 text-xs text-slate-400">
                      {formatDateTime(e.date)} · {e.startTime}-{e.endTime}
                      {e.platform ? ` · ${e.platform}` : ''}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent challenges */}
        <section className="card p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
              <Target className="h-4 w-4 text-primary-500" /> Recently published challenges
            </h2>
            <Link to="/challenges" className="text-sm font-semibold text-primary-600 hover:text-primary-700">Browse</Link>
          </div>
          {recentChallenges.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-400">No challenges yet.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {recentChallenges.map((c) => (
                <Link key={c._id} to={`/challenges/${c._id}`} className="rounded-xl border border-slate-100 p-4 transition hover:border-primary-200 hover:shadow-card">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold leading-snug text-slate-800">{c.title}</p>
                    <span className="badge bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20 shrink-0">{c.maxPoints} pts</span>
                  </div>
                  <p className="mt-1.5 line-clamp-2 text-xs text-slate-500">{truncate(c.description, 110)}</p>
                  <p className="mt-2 text-xs text-slate-400">Due {formatDateTime(c.deadline)}</p>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Personal activity */}
        <section className="card p-5">
          <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-slate-900">
            <Activity className="h-4 w-4 text-emerald-500" /> Your activity
          </h2>
          <ul className="space-y-3 text-sm">
            {[
              { icon: Inbox, label: 'Challenge submissions', value: personalActivity.submissions },
              { icon: CalendarDays, label: 'Events registered', value: personalActivity.eventsRegistered },
              { icon: MessageSquare, label: 'Community posts', value: personalActivity.posts },
              { icon: Bell, label: 'Unread notifications', value: personalActivity.unreadNotifications, link: '/notifications' },
            ].map(({ icon: Icon, label, value, link }) => {
              const inner = (
                <div className="flex items-center justify-between rounded-xl px-1 py-1.5">
                  <span className="flex items-center gap-2.5 text-slate-600"><Icon className="h-4 w-4 text-slate-400" /> {label}</span>
                  <span className="font-bold text-slate-900">{value}</span>
                </div>
              );
              return (
                <li key={label}>
                  {link ? <Link to={link} className="block transition hover:bg-slate-50">{inner}</Link> : inner}
                </li>
              );
            })}
          </ul>
          <div className="mt-4 border-t border-slate-100 pt-4">
            <Link to="/leaderboard" className="text-sm font-semibold text-primary-600 hover:text-primary-700">
              See the full leaderboard →
            </Link>
          </div>
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent reviews */}
        <section className="card p-5">
          <h2 className="mb-4 text-base font-semibold text-slate-900">Recent submission reviews</h2>
          {recentReviews.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-400">No reviews yet — submit your first challenge!</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {recentReviews.map((r) => (
                <li key={r._id} className="flex items-center gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-800">{r.challenge?.title || 'Challenge'}</p>
                    <p className="text-xs text-slate-400">{timeAgo(r.createdAt)}{r.feedback ? ` · “${truncate(r.feedback, 60)}”` : ''}</p>
                  </div>
                  <StatusBadge status={r.status} />
                  <span className="w-14 text-right text-sm font-bold text-slate-900">
                    {r.status === 'approved' ? `${r.pointsAwarded} pts` : '—'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Recent community activity */}
        <section className="card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900">Recent community activity</h2>
            <Link to="/community" className="text-sm font-semibold text-primary-600 hover:text-primary-700">Open feed</Link>
          </div>
          {recentActivity.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-400">Nothing here yet.</p>
          ) : (
            <ul className="space-y-3">
              {recentActivity.map((p) => (
                <li key={p.id}>
                  <Link to={`/community/${p.id}`} className="flex gap-3 rounded-xl p-2 transition hover:bg-slate-50">
                    <Avatar user={p.author} size="sm" />
                    <div className="min-w-0">
                      <p className="text-sm text-slate-700">
                        <span className="font-semibold text-slate-900">{p.author?.name}</span> posted{' '}
                        <span className="font-medium text-primary-700">“{p.title}”</span>
                      </p>
                      <p className="mt-0.5 text-xs text-slate-400">
                        {timeAgo(p.createdAt)} · ♥ {p.likeCount} · 💬 {p.commentCount}
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {leaderboardTop?.length > 0 && (
        <section className="card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
              <Trophy className="h-4 w-4 text-amber-500" /> Top of the leaderboard
            </h2>
            <Link to="/leaderboard" className="text-sm font-semibold text-primary-600 hover:text-primary-700">Full board</Link>
          </div>
          <ol className="grid gap-3 sm:grid-cols-3">
            {leaderboardTop.slice(0, 3).map((m) => (
              <li key={m.userId} className="flex items-center gap-3 rounded-xl border border-slate-100 p-3">
                <span className="text-lg font-black text-slate-300">{m.rank}</span>
                <Avatar user={m} size="sm" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-800">{m.name}</p>
                  <p className="text-xs font-bold text-primary-600">{m.points} pts</p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}
