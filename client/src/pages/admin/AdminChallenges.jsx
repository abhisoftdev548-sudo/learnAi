import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Target, Plus, Pencil, Trash2, Eye, Archive, Users as UsersIcon, Filter, ExternalLink,
} from 'lucide-react';
import api, { apiError } from '../../services/api';
import StatusBadge from '../../components/StatusBadge';
import { PageLoader, Spinner } from '../../components/Spinner';
import EmptyState from '../../components/EmptyState';
import ConfirmDialog from '../../components/ConfirmDialog';
import { Input, Select } from '../../components/Form';
import { formatDate, remainingTime, CATEGORY_LABELS, statusLabel } from '../../utils/format';
import AdminNav from './AdminNav';

export default function AdminChallenges() {
  const [data, setData] = useState(null);
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [confirm, setConfirm] = useState(null);

  const load = () => {
    const params = new URLSearchParams({ all: '1', limit: '50' });
    if (status) params.set('status', status);
    if (q) params.set('q', q);
    return api.get(`/challenges?${params}`).then((r) => setData(r.data.data));
  };

  useEffect(() => { load().catch((e) => toast.error(apiError(e))); }, [status, q]);

  const changeStatus = async (c, next) => {
    setBusyId(c.id);
    try {
      await api.post(`/challenges/${c.id}/status`, { status: next });
      toast.success(`Challenge ${next === 'published' ? 'published 🎉' : next}`);
      await load();
    } catch (e) {
      toast.error(apiError(e));
    } finally {
      setBusyId(null);
      if (confirm) setConfirm(null);
    }
  };

  const remove = async () => {
    setBusyId(confirm.challenge.id);
    try {
      await api.delete(`/challenges/${confirm.challenge.id}`);
      toast.success('Challenge deleted');
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
          <h1 className="text-2xl font-bold text-slate-900">Challenge management</h1>
          <p className="mt-1 text-sm text-slate-500">Create, publish, archive and monitor challenges.</p>
        </div>
        <Link to="/admin/challenges/new" className="btn-primary">
          <Plus className="h-4 w-4" /> New challenge
        </Link>
      </div>

      <div className="card flex flex-col gap-3 p-4 sm:flex-row">
        <div className="relative flex-1">
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search challenges…" />
        </div>
        <Select value={status} onChange={(e) => setStatus(e.target.value)} className="sm:!w-48">
          <option value="">All statuses</option>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
          <option value="archived">Archived</option>
        </Select>
      </div>

      {!data ? (
        <PageLoader label="Loading challenges…" />
      ) : data.items.length === 0 ? (
        <EmptyState icon={Target} title="No challenges yet" body="Create your first challenge to get the team moving."
          action={<Link to="/admin/challenges/new" className="btn-primary"><Plus className="h-4 w-4" /> New challenge</Link>} />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
                <th className="px-5 py-3 font-semibold">Challenge</th>
                <th className="px-5 py-3 font-semibold">Category</th>
                <th className="px-5 py-3 font-semibold">Deadline</th>
                <th className="px-5 py-3 font-semibold text-right">Points</th>
                <th className="px-5 py-3 font-semibold text-right">Submissions</th>
                <th className="px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {data.items.map((c) => {
                const rem = remainingTime(c.deadline);
                return (
                  <tr key={c.id} className="transition hover:bg-slate-50/70">
                    <td className="px-5 py-3">
                      <p className="max-w-[260px] truncate font-semibold text-slate-800">{c.title}</p>
                      <p className="text-xs capitalize text-slate-400">{c.difficulty}</p>
                    </td>
                    <td className="px-5 py-3 text-slate-600">{CATEGORY_LABELS[c.category] || c.category}</td>
                    <td className="px-5 py-3">
                      <p className="text-slate-700">{formatDate(c.deadline)}</p>
                      <p className={`text-xs ${rem.past ? 'text-slate-400' : rem.urgent ? 'text-rose-500' : 'text-slate-500'}`}>
                        {rem.past ? 'passed' : rem.text}
                      </p>
                    </td>
                    <td className="px-5 py-3 text-right font-bold text-amber-600">{c.maxPoints}</td>
                    <td className="px-5 py-3 text-right text-slate-700">{c.submissionCount ?? '—'}</td>
                    <td className="px-5 py-3"><StatusBadge status={c.status} /></td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-1.5">
                        <Link to={`/challenges/${c.id}`} className="btn-ghost !px-2.5 !py-1.5" title="View as member">
                          <ExternalLink className="h-4 w-4" />
                        </Link>
                        <Link to={`/admin/challenges/${c.id}/participation`} className="btn-ghost !px-2.5 !py-1.5" title="Participation report">
                          <UsersIcon className="h-4 w-4" />
                        </Link>
                        <Link to={`/admin/challenges/${c.id}/edit`} className="btn-ghost !px-2.5 !py-1.5" title="Edit">
                          <Pencil className="h-4 w-4" />
                        </Link>
                        {c.status !== 'published' && (
                          <button type="button" className="btn-ghost !px-2.5 !py-1.5" title="Publish"
                            disabled={busyId === c.id} onClick={() => changeStatus(c, 'published')}>
                            {busyId === c.id ? <Spinner className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        )}
                        {c.status === 'published' && (
                          <button type="button" className="btn-ghost !px-2.5 !py-1.5" title="Archive"
                            disabled={busyId === c.id} onClick={() => changeStatus(c, 'archived')}>
                            {busyId === c.id ? <Spinner className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
                          </button>
                        )}
                        <button type="button" className="btn-ghost !px-2.5 !py-1.5 !text-rose-500 hover:!bg-rose-50" title="Delete"
                          onClick={() => setConfirm({ challenge: c })}>
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={remove}
        title={`Delete "${confirm?.challenge?.title}"?`}
        body="This permanently removes the challenge. Challenges with submissions cannot be deleted — archive them instead."
        confirmLabel="Delete"
        danger
      />
    </div>
  );
}
