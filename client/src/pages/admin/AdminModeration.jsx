import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { ShieldAlert, Flag, Check, Trash2, MessageSquare, FileText } from 'lucide-react';
import api, { apiError } from '../../services/api';
import StatusBadge from '../../components/StatusBadge';
import Avatar from '../../components/Avatar';
import { PageLoader, Spinner } from '../../components/Spinner';
import EmptyState from '../../components/EmptyState';
import Modal from '../../components/Modal';
import { Field, Textarea } from '../../components/Form';
import { timeAgo, truncate } from '../../utils/format';
import AdminNav from './AdminNav';

export default function AdminModeration() {
  const [data, setData] = useState(null);
  const [filter, setFilter] = useState('open');
  const [resolveTarget, setResolveTarget] = useState(null);
  const [note, setNote] = useState('');
  const [removeContent, setRemoveContent] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = (status) => api.get(`/community/reports?status=${status}`)
    .then((r) => setData(r.data.data.items))
    .catch((e) => toast.error(apiError(e)));

  useEffect(() => { setData(null); load(filter); }, [filter]);

  const resolve = async () => {
    setBusy(true);
    try {
      await api.patch(`/community/reports/${resolveTarget.id}`, {
        status: 'resolved',
        note: note.trim(),
        action: removeContent ? 'remove_content' : undefined,
      });
      toast.success('Report resolved');
      setResolveTarget(null);
      setNote('');
      setRemoveContent(false);
      await load(filter);
    } catch (e) {
      toast.error(apiError(e));
    } finally {
      setBusy(false);
    }
  };

  const dismiss = async (r) => {
    try {
      await api.patch(`/community/reports/${r.id}`, { status: 'dismissed', note: 'No action needed' });
      toast.success('Report dismissed');
      await load(filter);
    } catch (e) {
      toast.error(apiError(e));
    }
  };

  return (
    <div className="space-y-6 animate-fadeUp">
      <AdminNav />

      <div>
        <h1 className="text-2xl font-bold text-slate-900">Community moderation</h1>
        <p className="mt-1 text-sm text-slate-500">Review reported posts and comments, remove harmful content.</p>
      </div>

      <div className="flex rounded-xl bg-slate-100 p-1 w-fit">
        {['open', 'resolved', 'dismissed'].map((f) => (
          <button key={f} type="button" onClick={() => setFilter(f)}
            className={`rounded-lg px-4 py-1.5 text-sm font-semibold capitalize transition ${filter === f ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            {f}
          </button>
        ))}
      </div>

      {!data ? (
        <PageLoader label="Loading reports…" />
      ) : data.length === 0 ? (
        <EmptyState icon={ShieldAlert}
          title={filter === 'open' ? 'No open reports' : `No ${filter} reports`}
          body={filter === 'open' ? 'Reported content from members will appear here for review.' : 'Nothing here yet.'} />
      ) : (
        <div className="space-y-4">
          {data.map((r) => (
            <div key={r.id} className="card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Avatar user={r.reporter} size="sm" />
                  <div>
                    <p className="text-sm font-semibold text-slate-800">
                      {r.reporter?.name} reported a {r.targetType}
                    </p>
                    <p className="text-xs text-slate-400">{timeAgo(r.createdAt)}</p>
                  </div>
                </div>
                <StatusBadge status={r.status} />
              </div>

              <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
                <Flag className="mr-1.5 inline h-3.5 w-3.5" />
                <span className="font-semibold">Reason:</span> {r.reason}
              </p>

              {r.target ? (
                <div className="mt-3 rounded-xl border border-slate-200 p-4">
                  <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
                    {r.targetType === 'post' ? <FileText className="h-3.5 w-3.5" /> : <MessageSquare className="h-3.5 w-3.5" />}
                    {r.targetType} content
                    {r.target.status === 'removed' && <span className="ml-2 badge bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-600/20">already removed</span>}
                  </p>
                  {r.targetType === 'post' ? (
                    <>
                      <p className="mt-1.5 font-semibold text-slate-800">{r.target.title}</p>
                      <p className="mt-1 text-sm text-slate-600">{truncate(r.target.body, 300)}</p>
                    </>
                  ) : (
                    <p className="mt-1.5 text-sm text-slate-600">{r.target.body}</p>
                  )}
                  <p className="mt-2 text-xs text-slate-400">by {r.target.author?.name} (@{r.target.author?.username})</p>
                </div>
              ) : (
                <p className="mt-3 text-sm text-slate-400">The reported content has been deleted.</p>
              )}

              {r.status === 'open' && (
                <div className="mt-4 flex justify-end gap-3 border-t border-slate-100 pt-4">
                  <button type="button" className="btn-secondary" onClick={() => dismiss(r)}>Dismiss report</button>
                  <button type="button" className="btn-primary" onClick={() => { setResolveTarget(r); setNote(''); setRemoveContent(false); }}>
                    <Check className="h-4 w-4" /> Resolve…
                  </button>
                </div>
              )}
              {r.resolutionNote && (
                <p className="mt-3 text-xs text-slate-400">Resolution: {r.resolutionNote}{r.resolvedBy ? ` — by ${r.resolvedBy.name}` : ''}</p>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal
        open={!!resolveTarget}
        onClose={() => !busy && setResolveTarget(null)}
        title="Resolve report"
        size="sm"
        footer={
          <>
            <button type="button" className="btn-secondary" onClick={() => setResolveTarget(null)} disabled={busy}>Cancel</button>
            <button type="button" className="btn-primary" onClick={resolve} disabled={busy}>
              {busy && <Spinner className="h-4 w-4" />} Resolve
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Resolution note">
            <Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="What did you decide and why?" maxLength={500} />
          </Field>
          <label className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
            <input type="checkbox" checked={removeContent} onChange={(e) => setRemoveContent(e.target.checked)} className="mt-0.5 h-4 w-4 rounded accent-rose-600" />
            <span>
              <span className="block font-semibold"><Trash2 className="mr-1 inline h-3.5 w-3.5" /> Remove the reported content</span>
              The post/comment will be hidden from the feed immediately.
            </span>
          </label>
        </div>
      </Modal>
    </div>
  );
}
