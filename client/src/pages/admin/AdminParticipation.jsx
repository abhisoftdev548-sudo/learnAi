import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeft, FileCheck2, CheckCircle2, Clock, Users, Percent } from 'lucide-react';
import api, { apiError } from '../../services/api';
import StatusBadge from '../../components/StatusBadge';
import Avatar from '../../components/Avatar';
import { PageLoader } from '../../components/Spinner';
import { formatDateTime } from '../../utils/format';
import AdminNav from './AdminNav';

export default function AdminParticipation() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [filter, setFilter] = useState('all');
  const [error, setError] = useState('');

  useEffect(() => {
    api.get(`/challenges/${id}/participation`)
      .then((r) => setData(r.data.data))
      .catch((e) => setError(apiError(e)));
  }, [id]);

  if (error) return <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>;
  if (!data) return <PageLoader label="Loading participation report…" />;

  const { challenge, stats, rows } = data;
  const filtered = filter === 'all' ? rows : rows.filter((r) => r.status === filter);

  const FILTERS = [
    { key: 'all', label: `All (${rows.length})` },
    { key: 'not_submitted', label: `Not submitted (${stats.notSubmitted})` },
    { key: 'submitted', label: `Submitted (${rows.filter((r) => r.status === 'submitted').length})` },
    { key: 'under_review', label: `Under review (${rows.filter((r) => r.status === 'under_review').length})` },
    { key: 'needs_changes', label: `Needs changes (${stats.needsChanges})` },
    { key: 'approved', label: `Approved (${stats.approved})` },
    { key: 'rejected', label: `Rejected (${stats.rejected})` },
    { key: 'overdue', label: `Overdue (${stats.overdue})` },
  ];

  return (
    <div className="space-y-6 animate-fadeUp">
      <AdminNav />

      <Link to="/admin/challenges" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-primary-600">
        <ArrowLeft className="h-4 w-4" /> All challenges
      </Link>

      <div>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold text-slate-900">{challenge.title}</h1>
          <StatusBadge status={challenge.status} />
        </div>
        <p className="mt-1 text-sm text-slate-500">
          Participation report · deadline {formatDateTime(challenge.deadline)} · computed from live records
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="card p-4">
          <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-slate-400"><Users className="h-3.5 w-3.5" /> Eligible</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{stats.eligible}</p>
        </div>
        <div className="card p-4">
          <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-slate-400"><FileCheck2 className="h-3.5 w-3.5" /> Submitted</p>
          <p className="mt-1 text-2xl font-bold text-emerald-600">{stats.submittedCount}
            <span className="ml-1 text-sm font-semibold text-slate-400">({stats.submissionPercent}%)</span>
          </p>
        </div>
        <div className="card p-4">
          <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-slate-400"><Clock className="h-3.5 w-3.5" /> On time / late</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{stats.onTime}<span className="text-slate-400"> / </span><span className="text-rose-500">{stats.late}</span></p>
        </div>
        <div className="card p-4">
          <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-slate-400"><CheckCircle2 className="h-3.5 w-3.5" /> Reviewed / pending</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{stats.reviewed}<span className="text-slate-400"> / </span><span className="text-amber-500">{stats.pendingReview}</span></p>
        </div>
      </div>

      <div className="card p-4">
        <div className="flex items-center gap-3">
          <Percent className="h-4 w-4 text-primary-500" />
          <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-gradient-to-r from-primary-500 to-indigo-500" style={{ width: `${stats.submissionPercent}%` }} />
          </div>
          <span className="text-sm font-bold text-slate-700">{stats.submissionPercent}% submitted</span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button key={f.key} type="button" onClick={() => setFilter(f.key)}
            className={filter === f.key ? 'btn-primary !py-1.5 !text-xs' : 'btn-secondary !py-1.5 !text-xs'}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
              <th className="px-5 py-3 font-semibold">Member</th>
              <th className="px-5 py-3 font-semibold">Status</th>
              <th className="px-5 py-3 font-semibold">Attempt</th>
              <th className="px-5 py-3 font-semibold">Submitted</th>
              <th className="px-5 py-3 font-semibold">Timing</th>
              <th className="px-5 py-3 text-right font-semibold">Score</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filtered.map((r) => (
              <tr key={r.memberId} className="transition hover:bg-slate-50/70">
                <td className="px-5 py-3">
                  <div className="flex items-center gap-3">
                    <Avatar user={r} size="sm" />
                    <div>
                      <p className="font-semibold text-slate-800">{r.name}</p>
                      <p className="text-xs text-slate-400">@{r.username}</p>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-3"><StatusBadge status={r.status} /></td>
                <td className="px-5 py-3 text-slate-600">{r.attempt || '—'}</td>
                <td className="px-5 py-3 text-slate-600">{r.submittedAt ? formatDateTime(r.submittedAt) : '—'}</td>
                <td className="px-5 py-3">
                  {r.isOnTime === null ? <span className="text-slate-300">—</span>
                    : r.isOnTime ? <span className="badge bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20">On time</span>
                    : <span className="badge bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-600/20">Late</span>}
                </td>
                <td className="px-5 py-3 text-right font-bold text-slate-800">{r.score ?? '—'}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="px-5 py-8 text-center text-sm text-slate-400">No members match this filter.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
