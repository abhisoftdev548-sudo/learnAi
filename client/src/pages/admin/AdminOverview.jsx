import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Users, UserCheck, Target, Inbox, CalendarDays, BarChart3, Clock, Trophy, Flag, TrendingUp,
} from 'lucide-react';
import api, { apiError } from '../../services/api';
import StatCard from '../../components/StatCard';
import StatusBadge from '../../components/StatusBadge';
import Avatar from '../../components/Avatar';
import { PageLoader } from '../../components/Spinner';
import { formatDateTime, timeAgo } from '../../utils/format';
import AdminNav from './AdminNav';

export default function AdminOverview() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/admin/stats')
      .then((r) => setData(r.data.data))
      .catch((e) => setError(apiError(e)));
  }, []);

  if (error) return <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>;
  if (!data) return <PageLoader label="Loading admin overview…" />;

  return (
    <div className="space-y-6 animate-fadeUp">
      <AdminNav />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Users} tone="sky" label="Registered users" value={data.registeredUsers} />
        <StatCard icon={Clock} tone="amber" label="Pending approvals" value={data.pendingUsers}
          hint={data.pendingUsers > 0 ? 'needs your attention' : 'all clear'} />
        <StatCard icon={UserCheck} tone="emerald" label="Approved members" value={data.approvedMembers} />
        <StatCard icon={Target} tone="primary" label="Active challenges" value={data.activeChallenges} />
        <StatCard icon={Inbox} tone="violet" label="Total submissions" value={data.totalSubmissions} hint={`${data.weeklySubmissions} this month`} />
        <StatCard icon={TrendingUp} tone="rose" label="Pending reviews" value={data.pendingReviews}
          hint={data.pendingReviews > 0 ? 'waiting for scoring' : 'queue empty'} />
        <StatCard icon={CalendarDays} tone="sky" label="Upcoming events" value={data.upcomingEvents} />
        <StatCard icon={BarChart3} tone="primary" label="Active polls" value={data.activePolls} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent reviews */}
        <section className="card p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
              <Trophy className="h-4 w-4 text-amber-500" /> Recent review activity
            </h2>
            <Link to="/admin/submissions" className="text-sm font-semibold text-primary-600 hover:text-primary-700">Open queue</Link>
          </div>
          {data.recentReviews.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-400">No reviews yet.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {data.recentReviews.map((r) => (
                <li key={r.id} className="flex items-center gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-800">
                      {r.challenge?.title || 'Challenge'} — <span className="font-normal text-slate-500">{r.member?.name}</span>
                    </p>
                    <p className="text-xs text-slate-400">reviewed by {r.reviewer?.name} · {timeAgo(r.createdAt)}</p>
                  </div>
                  <StatusBadge status={r.status} />
                  <span className="w-16 text-right text-sm font-bold text-slate-900">
                    {r.status === 'approved' ? `${r.pointsAwarded}` : '—'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Quick links + top members */}
        <section className="space-y-6">
          {data.pendingUsers > 0 && (
            <Link to="/admin/approvals" className="block rounded-2xl border border-amber-200 bg-amber-50 p-5 transition hover:shadow-card">
              <p className="flex items-center gap-2 text-sm font-bold text-amber-800">
                <UserCheck className="h-4 w-4" /> {data.pendingUsers} registration request{data.pendingUsers === 1 ? '' : 's'} waiting
              </p>
              <p className="mt-1 text-sm text-amber-700">Review and approve new members →</p>
            </Link>
          )}
          {data.openReports > 0 && (
            <Link to="/admin/moderation" className="block rounded-2xl border border-rose-200 bg-rose-50 p-5 transition hover:shadow-card">
              <p className="flex items-center gap-2 text-sm font-bold text-rose-800">
                <Flag className="h-4 w-4" /> {data.openReports} open report{data.openReports === 1 ? '' : 's'}
              </p>
              <p className="mt-1 text-sm text-rose-700">Review reported content →</p>
            </Link>
          )}
          <div className="card p-5">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">Top members</h2>
            <ul className="space-y-3">
              {data.topMembers.map((m) => (
                <li key={m._id} className="flex items-center gap-3">
                  <span className="w-5 text-sm font-black text-slate-300">{m.rank}</span>
                  <Avatar user={m} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-800">{m.name}</p>
                  </div>
                  <span className="text-sm font-bold text-primary-600">{m.points}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>

      <p className="text-xs text-slate-400">Stats refresh on page load · monthly posts: {data.monthlyPosts}</p>
    </div>
  );
}
