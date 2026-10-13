import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { UserCheck, Check, X, Mail, Calendar, Search } from 'lucide-react';
import api, { apiError } from '../../services/api';
import Avatar from '../../components/Avatar';
import { PageLoader, Spinner } from '../../components/Spinner';
import EmptyState from '../../components/EmptyState';
import Modal from '../../components/Modal';
import { Field, Input, Textarea } from '../../components/Form';
import { formatDate } from '../../utils/format';
import AdminNav from './AdminNav';

export default function AdminApprovals() {
  const [users, setUsers] = useState(null);
  const [q, setQ] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [reason, setReason] = useState('');

  const load = () => api.get('/admin/pending')
    .then((r) => setUsers(r.data.data.users))
    .catch((e) => toast.error(apiError(e)));

  useEffect(() => { load(); }, []);

  const approve = async (u) => {
    setBusyId(u._id);
    try {
      await api.patch(`/admin/users/${u._id}/status`, { status: 'approved' });
      toast.success(`${u.name} approved 🎉`);
      setUsers((list) => list.filter((x) => x._id !== u._id));
    } catch (e) {
      toast.error(apiError(e));
    } finally {
      setBusyId(null);
    }
  };

  const reject = async () => {
    if (!rejectTarget) return;
    setBusyId(rejectTarget._id);
    try {
      await api.patch(`/admin/users/${rejectTarget._id}/status`, { status: 'rejected', reason: reason.trim() });
      toast.success(`${rejectTarget.name} rejected`);
      setUsers((list) => list.filter((x) => x._id !== rejectTarget._id));
      setRejectTarget(null);
      setReason('');
    } catch (e) {
      toast.error(apiError(e));
    } finally {
      setBusyId(null);
    }
  };

  const filtered = (users || []).filter(
    (u) => !q || [u.name, u.username, u.email].some((f) => f.toLowerCase().includes(q.toLowerCase()))
  );

  return (
    <div className="space-y-6 animate-fadeUp">
      <AdminNav />

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Pending approvals</h1>
          <p className="mt-1 text-sm text-slate-500">Review registration requests before granting platform access.</p>
        </div>
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input className="input !pl-9" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter requests…" />
        </div>
      </div>

      {!users ? (
        <PageLoader label="Loading requests…" />
      ) : filtered.length === 0 ? (
        <EmptyState icon={UserCheck} title={q ? 'No matching requests' : 'No pending registrations'}
          body={q ? 'Try another search term.' : 'New registration requests will appear here for review.'} />
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {filtered.map((u) => (
            <div key={u._id} className="card p-5">
              <div className="flex items-start gap-4">
                <Avatar user={u} size="lg" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2">
                    <h2 className="font-semibold text-slate-900">{u.name}</h2>
                    <span className="text-sm text-slate-400">@{u.username}</span>
                  </div>
                  <p className="mt-0.5 flex items-center gap-1.5 text-sm text-slate-500">
                    <Mail className="h-3.5 w-3.5" /> {u.email}
                  </p>
                  <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-400">
                    <Calendar className="h-3.5 w-3.5" /> Registered {formatDate(u.createdAt)}
                  </p>
                  {u.bio && <p className="mt-2 rounded-lg bg-slate-50 p-2.5 text-sm text-slate-600">{u.bio}</p>}
                  {u.skills?.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {u.skills.map((s) => (
                        <span key={s} className="badge bg-primary-50 text-primary-700 ring-1 ring-inset ring-primary-600/20">{s}</span>
                      ))}
                    </div>
                  )}
                  {u.photoUrl && (
                    <div className="mt-2 text-xs text-slate-400">
                      Profile photo:{' '}
                      <a href={u.photoUrl} target="_blank" rel="noreferrer" className="text-primary-600 hover:underline">view</a>
                    </div>
                  )}
                </div>
              </div>
              <div className="mt-4 flex justify-end gap-3 border-t border-slate-100 pt-4">
                <button type="button" className="btn-secondary" onClick={() => { setRejectTarget(u); setReason(''); }} disabled={busyId === u._id}>
                  <X className="h-4 w-4" /> Reject
                </button>
                <button type="button" className="btn-primary" onClick={() => approve(u)} disabled={busyId === u._id}>
                  {busyId === u._id ? <Spinner className="h-4 w-4" /> : <Check className="h-4 w-4" />} Approve
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={!!rejectTarget}
        onClose={() => !busyId && setRejectTarget(null)}
        title={`Reject ${rejectTarget?.name}?`}
        size="sm"
        footer={
          <>
            <button type="button" className="btn-secondary" onClick={() => setRejectTarget(null)} disabled={!!busyId}>Cancel</button>
            <button type="button" className="btn-danger" onClick={reject} disabled={!!busyId}>
              {busyId && <Spinner className="h-4 w-4" />} Reject registration
            </button>
          </>
        }
      >
        <p className="mb-3 text-sm text-slate-600">
          The user will be told their registration was not approved and cannot sign in.
        </p>
        <Field label="Reason (optional, sent to the user)">
          <Textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Not a member of this team…" maxLength={500} />
        </Field>
      </Modal>
    </div>
  );
}
