import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Inbox, Search, Filter, ExternalLink } from 'lucide-react';
import api, { apiError } from '../../services/api';
import StatusBadge from '../../components/StatusBadge';
import Avatar from '../../components/Avatar';
import { PageLoader } from '../../components/Spinner';
import EmptyState from '../../components/EmptyState';
import Pagination from '../../components/Pagination';
import { Input, Select } from '../../components/Form';
import { formatDateTime } from '../../utils/format';
import AdminNav from './AdminNav';

export default function AdminSubmissions() {
  const [params, setParams] = useSearchParams();
  const [data, setData] = useState(null);
  const [challenges, setChallenges] = useState([]);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState(params.get('status') || '');
  const [challenge, setChallenge] = useState(params.get('challenge') || '');
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/challenges?all=1&limit=50')
      .then((r) => setChallenges(r.data.data.items))
      .catch(() => {});
  }, []);

  const query = useMemo(() => {
    const p = new URLSearchParams({ page: String(page), limit: '20' });
    if (status) p.set('status', status);
    if (challenge) p.set('challenge', challenge);
    return p.toString();
  }, [status, challenge, page]);

  useEffect(() => {
    let alive = true;
    setData(null);
    api.get(`/submissions?${query}`)
      .then((r) => alive && setData(r.data.data))
      .catch((e) => alive && setError(apiError(e)));
    return () => { alive = false; };
  }, [query]);

  useEffect(() => setPage(1), [status, challenge]);

  const filtered = (data?.items || []).filter(
    (s) => !q || [s.member?.name, s.member?.username, s.challenge?.title]
      .some((f) => f && f.toLowerCase().includes(q.toLowerCase()))
  );

  if (error) return <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>;

  return (
    <div className="space-y-6 animate-fadeUp">
      <AdminNav />

      <div>
        <h1 className="text-2xl font-bold text-slate-900">Submission review queue</h1>
        <p className="mt-1 text-sm text-slate-500">Score submissions, leave feedback and request revisions.</p>
      </div>

      <div className="card grid gap-3 p-4 sm:grid-cols-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter by member or challenge…" className="!pl-9" />
        </div>
        <Select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          <option value="submitted">Submitted (awaiting review)</option>
          <option value="under_review">Under review</option>
          <option value="needs_changes">Needs changes</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </Select>
        <Select value={challenge} onChange={(e) => { setChallenge(e.target.value); if (e.target.value) setParams({ challenge: e.target.value }); else setParams({}); }}>
          <option value="">All challenges</option>
          {challenges.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
        </Select>
      </div>

      {!data ? (
        <PageLoader label="Loading submissions…" />
      ) : filtered.length === 0 ? (
        <EmptyState icon={Inbox} title="No submissions match" body="Adjust the filters or check back once members start submitting." />
      ) : (
        <>
          <div className="card overflow-x-auto">
            <table className="w-full min-w-[880px] text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
                  <th className="px-5 py-3 font-semibold">Member</th>
                  <th className="px-5 py-3 font-semibold">Challenge</th>
                  <th className="px-5 py-3 font-semibold">Submitted</th>
                  <th className="px-5 py-3 font-semibold">Timing</th>
                  <th className="px-5 py-3 font-semibold">Attempt</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 font-semibold text-right">Score</th>
                  <th className="px-5 py-3 text-right font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map((s) => (
                  <tr key={s._id} className="transition hover:bg-slate-50/70">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar user={s.member} size="sm" />
                        <div>
                          <p className="font-semibold text-slate-800">{s.member?.name}</p>
                          <p className="text-xs text-slate-400">@{s.member?.username}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <p className="max-w-[200px] truncate text-slate-700">{s.challenge?.title}</p>
                      <p className="text-xs text-slate-400">max {s.challenge?.maxPoints} pts</p>
                    </td>
                    <td className="px-5 py-3 text-slate-600">{formatDateTime(s.submittedAt)}</td>
                    <td className="px-5 py-3">
                      {s.isOnTime
                        ? <span className="badge bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20">On time</span>
                        : <span className="badge bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-600/20">Late</span>}
                    </td>
                    <td className="px-5 py-3 text-slate-600">#{s.attempt}</td>
                    <td className="px-5 py-3"><StatusBadge status={s.status} /></td>
                    <td className="px-5 py-3 text-right font-bold text-slate-800">{s.score ?? '—'}</td>
                    <td className="px-5 py-3 text-right">
                      <Link to={`/admin/submissions/${s._id}`} className="btn-primary !px-3 !py-1.5 !text-xs">
                        Review <ExternalLink className="h-3.5 w-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={data.page} pages={data.pages} total={data.total} onChange={setPage} />
        </>
      )}
    </div>
  );
}
