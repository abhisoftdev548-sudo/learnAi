import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { KeyRound, LogOut, ShieldCheck, Save, UserCog } from 'lucide-react';
import api, { apiError } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Field, Input, SubmitButton } from '../components/Form';
import StatusBadge from '../components/StatusBadge';
import ConfirmDialog from '../components/ConfirmDialog';

export default function Settings() {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [pwd, setPwd] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [busy, setBusy] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);

  const changePassword = async (e) => {
    e.preventDefault();
    if (pwd.newPassword.length < 8) return toast.error('New password must be at least 8 characters');
    if (pwd.newPassword !== pwd.confirm) return toast.error('New passwords do not match');
    setBusy(true);
    try {
      await api.patch('/users/me/password', {
        currentPassword: pwd.currentPassword,
        newPassword: pwd.newPassword,
      });
      toast.success('Password updated');
      setPwd({ currentPassword: '', newPassword: '', confirm: '' });
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6 animate-fadeUp">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Account settings</h1>
        <p className="mt-1 text-sm text-slate-500">Manage your sign-in credentials and session.</p>
      </div>

      {/* Account overview */}
      <div className="card p-6">
        <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
          <UserCog className="h-4 w-4 text-primary-500" /> Account
        </h2>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-100 p-3">
            <dt className="text-xs uppercase tracking-wide text-slate-400">Username</dt>
            <dd className="mt-0.5 text-sm font-semibold text-slate-800">@{user?.username}</dd>
          </div>
          <div className="rounded-xl border border-slate-100 p-3">
            <dt className="text-xs uppercase tracking-wide text-slate-400">Email</dt>
            <dd className="mt-0.5 text-sm font-semibold text-slate-800">{user?.email}</dd>
          </div>
          <div className="rounded-xl border border-slate-100 p-3">
            <dt className="text-xs uppercase tracking-wide text-slate-400">Role</dt>
            <dd className="mt-0.5 text-sm font-semibold text-slate-800 capitalize">{user?.role}</dd>
          </div>
          <div className="rounded-xl border border-slate-100 p-3">
            <dt className="text-xs uppercase tracking-wide text-slate-400">Status</dt>
            <dd className="mt-0.5"><StatusBadge status={user?.status} /></dd>
          </div>
        </dl>
        {isAdmin && (
          <p className="mt-4 flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm text-slate-200">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            You have administrator access — the Admin Panel is available in your sidebar.
          </p>
        )}
      </div>

      {/* Change password */}
      <form onSubmit={changePassword} className="card space-y-4 p-6">
        <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
          <KeyRound className="h-4 w-4 text-primary-500" /> Change password
        </h2>
        <Field label="Current password" required>
          <Input type="password" value={pwd.currentPassword} onChange={(e) => setPwd({ ...pwd, currentPassword: e.target.value })} autoComplete="current-password" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="New password" required hint="At least 8 characters">
            <Input type="password" value={pwd.newPassword} onChange={(e) => setPwd({ ...pwd, newPassword: e.target.value })} autoComplete="new-password" />
          </Field>
          <Field label="Confirm new password" required>
            <Input type="password" value={pwd.confirm} onChange={(e) => setPwd({ ...pwd, confirm: e.target.value })} autoComplete="new-password" />
          </Field>
        </div>
        <div className="flex justify-end">
          <SubmitButton busy={busy} className="btn-primary"><Save className="h-4 w-4" /> Update password</SubmitButton>
        </div>
      </form>

      {/* Session */}
      <div className="card flex flex-wrap items-center justify-between gap-4 p-6">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Session</h2>
          <p className="text-sm text-slate-500">Sign out of Growth Circle on this device.</p>
        </div>
        <button type="button" className="btn-danger" onClick={() => setLogoutOpen(true)}>
          <LogOut className="h-4 w-4" /> Sign out
        </button>
      </div>

      <ConfirmDialog
        open={logoutOpen}
        onClose={() => setLogoutOpen(false)}
        onConfirm={async () => { await logout(); navigate('/login'); }}
        title="Sign out?"
        body="You will need to sign in again to access the platform."
        confirmLabel="Sign out"
        danger
      />
    </div>
  );
}
