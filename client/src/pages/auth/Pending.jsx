import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Clock, XCircle, Ban, ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useEffect } from 'react';

const MESSAGES = {
  pending: {
    icon: Clock,
    tone: 'bg-amber-50 text-amber-600',
    title: 'Waiting for admin approval',
    body: 'Your account is waiting for admin approval. You will be able to access the team platform after verification.',
  },
  rejected: {
    icon: XCircle,
    tone: 'bg-rose-50 text-rose-600',
    title: 'Registration not approved',
    body: 'Your registration was rejected. Contact an administrator for more information.',
  },
  suspended: {
    icon: Ban,
    tone: 'bg-rose-50 text-rose-600',
    title: 'Account suspended',
    body: 'Your account has been suspended. Please contact an administrator.',
  },
};

export default function Pending() {
  const { authStatus, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Approved members don't belong here.
  useEffect(() => {
    if (authStatus === 'in') navigate('/dashboard', { replace: true });
  }, [authStatus, navigate]);

  const codeToStatus = {
    PENDING_APPROVAL: 'pending',
    ACCOUNT_REJECTED: 'rejected',
    ACCOUNT_SUSPENDED: 'suspended',
  };
  const key = authStatus === 'out' ? (codeToStatus[location.state?.code] || 'pending') : authStatus;
  const info = MESSAGES[key] || MESSAGES.pending;
  const Icon = info.icon;
  const justRegistered = location.state?.justRegistered;

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="card w-full max-w-lg animate-fadeUp p-8 text-center">
        <span className={`mx-auto inline-flex h-16 w-16 items-center justify-center rounded-2xl ${info.tone}`}>
          <Icon className="h-8 w-8" />
        </span>
        <h1 className="mt-6 text-2xl font-bold text-slate-900">{info.title}</h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-slate-500">{info.body}</p>

        {justRegistered && (
          <div className="mx-auto mt-5 max-w-md rounded-xl border border-primary-100 bg-primary-50 p-3.5 text-sm text-primary-800">
            Thanks{location.state?.name ? `, ${location.state.name.split(' ')[0]}` : ''}! Your account was
            created successfully. An admin will review it shortly — you can sign in once approved.
          </div>
        )}

        <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link to="/login" className="btn-primary w-full sm:w-auto">
            Back to sign in <ArrowRight className="h-4 w-4" />
          </Link>
          {authStatus !== 'out' && (
            <button type="button" className="btn-secondary w-full sm:w-auto" onClick={async () => { await logout(); navigate('/login'); }}>
              Sign out
            </button>
          )}
        </div>

        <p className="mt-6 text-xs text-slate-400">
          Approval usually takes a few minutes. You can refresh this page to check again.
        </p>
      </div>
    </div>
  );
}
