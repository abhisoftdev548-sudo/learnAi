import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { BarChart3, Plus, Pencil, Trash2, PlayCircle, Lock, Archive, Users, Eye } from 'lucide-react';
import api, { apiError } from '../../services/api';
import StatusBadge from '../../components/StatusBadge';
import { PageLoader, Spinner } from '../../components/Spinner';
import EmptyState from '../../components/EmptyState';
import ConfirmDialog from '../../components/ConfirmDialog';
import { formatDateTime } from '../../utils/format';
import AdminNav from './AdminNav';

export default function AdminPolls() {
  const [data, setData] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [confirm, setConfirm] = useState(null);

  const load = () => api.get('/polls?all=1')
    .then((r) => setData(r.data.data))
    .catch((e) => toast.error(apiError(e)));

  useEffect(() => { load(); }, []);

  const changeStatus = async (p, status) => {
    setBusyId(p.id);
    try {
      await api.post(`/polls/${p.id}/status`, { status });
      toast.success(`Poll ${status}`);
      await load();
    } catch (e) {
      toast.error(apiError(e));
    } finally {
      setBusyId(null);
    }
  };

  const remove = async () => {
    setBusyId(confirm.poll.id);
    try {
      await api.delete(`/polls/${confirm.poll.id}`);
      toast.success('Poll deleted');
      setConfirm(null);
      await load();
    } catch (e) {
      toast.error(apiError(e));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6 animate-fadeUp">
      <AdminNav />

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Poll management</h1>
          <p className="mt-1 text-sm text-slate-500">Create polls, control voting windows and inspect results.</p>
        </div>
        <Link to="/admin/polls/new" className="btn-primary"><Plus className="h-4 w-4" /> New poll</Link>
      </div>

      {!data ? (
        <PageLoader label="Loading polls…" />
      ) : data.items.length === 0 ? (
        <EmptyState icon={BarChart3} title="No polls yet" body="Ask the team something — polls take a minute to create."
          action={<Link to="/admin/polls/new" className="btn-primary"><Plus className="h-4 w-4" /> New poll</Link>} />
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {data.items.map((p) => (
            <div key={p.id} className="card flex flex-col p-5">
              <div className="flex items-start justify-between gap-2">
                <StatusBadge status={p.liveStatus} />
                <div className="flex gap-1.5 text-xs text-slate-400">
                  {p.anonymous && <span className="badge bg-slate-100 ring-1 ring-inset ring-slate-500/20">anon</span>}
                  {p.visibility === 'admins' && <span className="badge bg-slate-100 ring-1 ring-inset ring-slate-500/20">admins</span>}
                </div>
              </div>

              <h2 className="mt-3 line-clamp-2 text-base font-semibold leading-snug text-slate-900">{p.question}</h2>
              <p className="mt-2 text-xs text-slate-400">
                {formatDateTime(p.startsAt)} → {formatDateTime(p.endsAt)}
              </p>
              <p className="mt-1 text-sm text-slate-500">
                {p.options.length} options ·{' '}
                {p.results ? <span className="font-semibold text-slate-700">{p.results.totalVotes} votes</span> : 'results hidden'}
              </p>

              {p.results && (
                <ul className="mt-3 space-y-1.5">
                  {p.results.options.slice(0, 4).map((o) => (
                    <li key={o.id} className="text-xs">
                      <div className="flex justify-between text-slate-600">
                        <span className="truncate">{o.text}</span>
                        <span className="ml-2 font-semibold">{o.votes}</span>
                      </div>
                      <div className="mt-0.5 h-1.5 rounded-full bg-slate-100">
                        <div className="h-full rounded-full bg-primary-500" style={{ width: `${o.percent}%` }} />
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              <div className="mt-4 flex flex-wrap gap-1.5 border-t border-slate-100 pt-3">
                <Link to={`/admin/polls/${p.id}/edit`} className="btn-ghost !px-2.5 !py-1.5" title="Edit">
                  <Pencil className="h-4 w-4" />
                </Link>
                <Link to={`/polls/${p.id}`} className="btn-ghost !px-2.5 !py-1.5" title="View as member">
                  <Eye className="h-4 w-4" />
                </Link>
                {p.status === 'draft' && (
                  <button type="button" className="btn-secondary !px-3 !py-1.5 !text-xs" disabled={busyId === p.id}
                    onClick={() => changeStatus(p, 'active')}>
                    {busyId === p.id ? <Spinner className="h-3.5 w-3.5" /> : <PlayCircle className="h-3.5 w-3.5" />} Open voting
                  </button>
                )}
                {p.liveStatus === 'active' && (
                  <button type="button" className="btn-secondary !px-3 !py-1.5 !text-xs" disabled={busyId === p.id}
                    onClick={() => changeStatus(p, 'closed')}>
                    {busyId === p.id ? <Spinner className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />} Close now
                  </button>
                )}
                {p.status !== 'archived' && p.status !== 'draft' && (
                  <button type="button" className="btn-ghost !px-2.5 !py-1.5" title="Archive" disabled={busyId === p.id}
                    onClick={() => changeStatus(p, 'archived')}>
                    <Archive className="h-4 w-4" />
                  </button>
                )}
                {p.status === 'draft' && (
                  <button type="button" className="btn-ghost !px-2.5 !py-1.5 !text-rose-500 hover:!bg-rose-50" title="Delete"
                    onClick={() => setConfirm({ poll: p })}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={remove}
        title={`Delete "${confirm?.poll?.question?.slice(0, 60)}?"`}
        body="Only draft polls can be deleted. Active/closed polls can be archived instead."
        confirmLabel="Delete"
        danger
      />
    </div>
  );
}
