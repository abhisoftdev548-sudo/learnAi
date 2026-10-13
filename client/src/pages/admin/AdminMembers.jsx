import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Users, Search, ShieldCheck, Shield, Ban, CheckCircle2, PauseCircle } from 'lucide-react';
import api, { apiError } from '../../services/api';
import Avatar from '../../components/Avatar';
import StatusBadge from '../../components/StatusBadge';
import { PageLoader, Spinner } from '../../components/Spinner';
import EmptyState from '../../components/EmptyState';
import Pagination from '../../components/Pagination';
import ConfirmDialog from '../../components/ConfirmDialog';
import { Input, Select } from '../../components/Form';
import { formatDate } from '../../utils/format';
import AdminNav from './AdminNav';

export default function AdminMembers() {
  const [data, setData] = useState(null);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [busyId, setBusyId] = useState(null);
  const [confirm, setConfirm] = useState(null); // { type, user }

  useEffect(() => {
    let alive = true;
    setData(null);
    const params = new URLSearchParams({ page: String(page), limit: '20' });
    if (q) params.set('q', q);
    if (status) params.set('status', status);
    api.get(`/admin/users?${params}`)
      .then((r) => alive && setData(r.data.data))
      .catch((e) => toast.error(apiError(e)));
    return () => { alive = false; };
  }, [q, status, page]);

  useEffect(() => setPage(1), [q, status]);

  const run = async (fn, successMsg) => {
    setBusyId(confirm.user._id);
    try {
      await fn();
      toast.success(successMsg);
      setConfirm(null);
      // refresh current page
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (q) params.set('q', q);
      if (status) params.set('status', status);
      const { data: d } = await api.get(`/admin/users?${params}`);
      setData(d.data);
    } catch (e) {
      toast.error(apiError(e));
    } finally {
      setBusyId(null);
    }
  };

  const actions = {
    approve: () => run(
      () => api.patch(`/admin/users/${confirm.user._id}/status`, { status: 'approved' }),
      `${confirm.user.name} approved`
    ),
    reject: () => run(
      () => api.patch(`/admin/users/${confirm.user._id}/status`, { status: 'rejected', reason: 'Rejected by admin' }),
      `${confirm.user.name} rejected`
    ),
    suspend: () => run(
      () => api.patch(`/admin/users/${confirm.user._id}/status`, { status: 'suspended' }),
      `${confirm.user.name} suspended`
    ),
    reactivate: () => run(
      () => api.patch(`/admin/users/${confirm.user._id}/status`, { status: 'approved' }),
      `${confirm.user.name} reactivated`
    ),
    makeAdmin: () => run(
      () => api.patch(`/admin/users/${confirm.user._id}/role`, { role: 'admin' }),
      `${confirm.user.name} is now an admin`
    ),
    makeMember: () => run(
      () => api.patch(`/admin/users/${confirm.user._id}/role`, { role: 'member' }),
      `${confirm.user.name} is now a member`
    ),
  };

  if (!data) return <PageLoader label="Loading members…" />;

  return (
    <div className="space-y-6 animate-fadeUp">
      <AdminNav />

      <div>
        <h1 className="text-2xl font-bold text-slate-900">Member management</h1>
        <p className="mt-1 text-sm text-slate-500">Search accounts, change statuses and manage roles.</p>
      </div>

      <div className="card flex flex-col gap-3 p-4 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, username or email…" className="!pl-9" />
        </div>
        <Select value={status} onChange={(e) => setStatus(e.target.value)} className="sm:!w-48">
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="suspended">Suspended</option>
        </Select>
      </div>

      {data.users.length === 0 ? (
        <EmptyState icon={Users} title="No members found" body="Adjust your filters." />
      ) : (
        <>
          <div className="card overflow-x-auto">
            <table className="w-full min-w-[860px] text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
                  <th className="px-5 py-3 font-semibold">Member</th>
                  <th className="px-5 py-3 font-semibold">Email</th>
                  <th className="px-5 py-3 font-semibold">Joined</th>
                  <th className="px-5 py-3 font-semibold">Role</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 font-semibold">Points</th>
                  <th className="px-5 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {data.users.map((u) => (
                  <tr key={u._id} className="transition hover:bg-slate-50/70">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar user={u} size="sm" />
                        <div>
                          <p className="font-semibold text-slate-800">{u.name}</p>
                          <p className="text-xs text-slate-400">@{u.username}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-slate-600">{u.email}</td>
                    <td className="px-5 py-3 text-slate-500">{formatDate(u.createdAt)}</td>
                    <td className="px-5 py-3">
                      <span className={`badge ring-1 ring-inset ${u.role === 'admin' ? 'bg-slate-900 text-white ring-slate-900/30' : 'bg-slate-100 text-slate-600 ring-slate-500/20'}`}>
                        {u.role === 'admin' ? <ShieldCheck className="h-3 w-3" /> : <Shield className="h-3 w-3" />}
                        {u.role}
                      </span>
                    </td>
                    <td className="px-5 py-3"><StatusBadge status={u.status} /></td>
                    <td className="px-5 py-3 font-bold text-slate-800">{u.points}</td>
                    <td className="px-5 py-3">
                      <div className="flex flex-wrap justify-end gap-1.5">
                        {u.status === 'pending' && (
                          <>
                            <button type="button" className="btn-primary !px-3 !py-1.5 !text-xs" disabled={busyId === u._id} onClick={() => setConfirm({ type: 'approve', user: u })}>
                              <CheckCircle2 className="h-3.5 w-3.5" /> Approve
                            </button>
                            <button type="button" className="btn-danger !px-3 !py-1.5 !text-xs" disabled={busyId === u._id} onClick={() => setConfirm({ type: 'reject', user: u })}>
                              Reject
                            </button>
                          </>
                        )}
                        {u.status === 'approved' && (
                          <button type="button" className="btn-secondary !px-3 !py-1.5 !text-xs" disabled={busyId === u._id} onClick={() => setConfirm({ type: 'suspend', user: u })}>
                            <PauseCircle className="h-3.5 w-3.5" /> Suspend
                          </button>
                        )}
                        {(u.status === 'suspended' || u.status === 'rejected') && (
                          <button type="button" className="btn-primary !px-3 !py-1.5 !text-xs" disabled={busyId === u._id} onClick={() => setConfirm({ type: 'reactivate', user: u })}>
                            <Ban className="h-3.5 w-3.5 rotate-180" /> Reactivate
                          </button>
                        )}
                        {u.status === 'approved' && u.role === 'member' && (
                          <button type="button" className="btn-secondary !px-3 !py-1.5 !text-xs" disabled={busyId === u._id} onClick={() => setConfirm({ type: 'makeAdmin', user: u })}>
                            Make admin
                          </button>
                        )}
                        {u.status === 'approved' && u.role === 'admin' && (
                          <button type="button" className="btn-secondary !px-3 !py-1.5 !text-xs" disabled={busyId === u._id} onClick={() => setConfirm({ type: 'makeMember', user: u })}>
                            Make member
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={data.page} pages={data.pages} total={data.total} onChange={setPage} />
        </>
      )}

      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={confirm ? actions[confirm.type] : undefined}
        title={
          confirm
            ? {
                approve: `Approve ${confirm.user.name}?`,
                reject: `Reject ${confirm.user.name}?`,
                suspend: `Suspend ${confirm.user.name}?`,
                reactivate: `Reactivate ${confirm.user.name}?`,
                makeAdmin: `Give admin role to ${confirm.user.name}?`,
                makeMember: `Remove admin role from ${confirm.user.name}?`,
              }[confirm.type]
            : ''
        }
        body={
          confirm
            ? {
                approve: 'They will be able to sign in and access the platform immediately.',
                reject: 'They will see a "registration not approved" message and cannot sign in.',
                suspend: 'Their access will be blocked until you reactivate the account.',
                reactivate: 'Their account will be fully approved again.',
                makeAdmin: 'They will get full access to the admin panel. Only do this for trusted people.',
                makeMember: 'They will lose access to the admin panel (at least one admin must remain).',
              }[confirm.type]
            : ''
        }
        confirmLabel={confirm ? { approve: 'Approve', reject: 'Reject', suspend: 'Suspend', reactivate: 'Reactivate', makeAdmin: 'Make admin', makeMember: 'Make member' }[confirm.type] : 'Confirm'}
        danger={['reject', 'suspend', 'makeMember'].includes(confirm?.type)}
      />
    </div>
  );
}
