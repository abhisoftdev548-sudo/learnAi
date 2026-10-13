import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BarChart3, Search, Vote, Clock } from 'lucide-react';
import api, { apiError } from '../services/api';
import StatusBadge from '../components/StatusBadge';
import { PageLoader } from '../components/Spinner';
import EmptyState from '../components/EmptyState';
import { Input } from '../components/Form';
import { formatDateTime, truncate } from '../utils/format';

function PollStatus({ poll }) {
  const map = { active: 'active', scheduled: 'scheduled', closed: 'closed', archived: 'archived', draft: 'draft' };
  return <StatusBadge status={map[poll.liveStatus] || poll.liveStatus} />;
}

export default function Polls() {
  const [data, setData] = useState(null);
  const [q, setQ] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    api.get('/polls')
      .then((r) => alive && setData(r.data.data))
      .catch((e) => alive && setError(apiError(e)));
    return () => { alive = false; };
  }, []);

  if (error) return <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>;
  if (!data) return <PageLoader label="Loading polls…" />;

  const items = data.items.filter((p) => !q || p.question.toLowerCase().includes(q.toLowerCase()));
  const open = items.filter((p) => p.liveStatus === 'active' || p.liveStatus === 'scheduled');
  const done = items.filter((p) => !['active', 'scheduled'].includes(p.liveStatus));

  const renderCard = (p) => (
    <Link key={p.id} to={`/polls/${p.id}`} className="card group flex flex-col p-5 transition hover:-translate-y-0.5 hover:shadow-pop">
      <div className="flex items-start justify-between gap-3">
        <PollStatus poll={p} />
        <div className="flex items-center gap-2 text-xs text-slate-400">
          {p.anonymous && <span className="badge bg-slate-100 text-slate-500 ring-1 ring-inset ring-slate-500/20">Anonymous</span>}
          {p.allowMultiple && <span className="badge bg-slate-100 text-slate-500 ring-1 ring-inset ring-slate-500/20">Multi-choice</span>}
        </div>
      </div>
      <h2 className="mt-3 line-clamp-2 text-base font-semibold leading-snug text-slate-900 group-hover:text-primary-700">
        {p.question}
      </h2>
      {p.image && <img src={p.image} alt="" className="mt-3 h-32 w-full rounded-lg bg-slate-50 object-contain" loading="lazy" referrerPolicy="no-referrer" />}
      {p.description && <p className="mt-1 line-clamp-2 text-sm text-slate-500">{truncate(p.description, 120)}</p>}
      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-400">
        <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> Ends {formatDateTime(p.endsAt)}</span>
        <span className="flex items-center gap-1.5 font-semibold text-primary-600">
          <Vote className="h-3.5 w-3.5" />
          {p.results ? `${p.results.totalVotes} vote${p.results.totalVotes === 1 ? '' : 's'}` : p.hasVoted ? 'Voted' : 'View & vote'}
        </span>
      </div>
    </Link>
  );

  return (
    <div className="space-y-5 animate-fadeUp">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Polls</h1>
        <p className="mt-1 text-sm text-slate-500">Have your say — vote in team polls and watch results roll in.</p>
      </div>

      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search polls…" className="!pl-9" />
      </div>

      {items.length === 0 ? (
        <EmptyState icon={BarChart3} title="No polls yet" body="Polls opened by admins will appear here." />
      ) : (
        <div className="space-y-8">
          {open.length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">Open now</h2>
              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{open.map(renderCard)}</div>
            </section>
          )}
          {done.length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">Closed &amp; archived</h2>
              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{done.map(renderCard)}</div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
