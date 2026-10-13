import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { Rocket, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Field, Input, SubmitButton } from '../../components/Form';
import { apiFieldErrors } from '../../services/api';

export default function Login() {
  const { login, authStatus } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ identifier: '', password: '' });
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [code, setCode] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    document.title = 'Sign in · Growth Circle';
  }, []);

  // Already signed in?
  if (authStatus === 'in') {
    navigate('/dashboard', { replace: true });
  }

  const onSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    setCode(null);
    setFieldErrors({});
    const res = await login(form.identifier.trim(), form.password);
    setBusy(false);
    if (res.ok) {
      toast.success(`Welcome back, ${res.user.name.split(' ')[0]}!`);
      const next = location.state?.from;
      navigate(next && next !== '/login' ? next : '/dashboard', { replace: true });
      return;
    }
    setCode(res.code);
    setError(res.message);
  };

  const goToStatus = () => navigate('/pending', { state: { code } });

  return (
    <div className="flex min-h-screen">
      {/* Left brand panel */}
      <div className="relative hidden w-1/2 flex-col justify-between bg-slate-900 p-12 lg:flex">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(109,63,240,0.35),transparent_50%)]" />
        <Link to="/" className="relative flex items-center gap-2.5 text-white">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-primary-500">
            <Rocket className="h-5 w-5" />
          </span>
          <span className="text-lg font-bold">Growth Circle</span>
        </Link>
        <div className="relative">
          <h2 className="text-3xl font-bold leading-tight text-white">
            Practice together.<br />Level up together.
          </h2>
          <p className="mt-4 max-w-md text-slate-400">
            Challenges, events, polls and a leaderboard for your private team — sign in to see
            what’s waiting for you.
          </p>
        </div>
        <p className="relative text-sm text-slate-500">Private platform · admin-approved members only</p>
      </div>

      {/* Form */}
      <div className="flex w-full items-center justify-center px-4 py-12 sm:px-6 lg:w-1/2">
        <div className="w-full max-w-md animate-fadeUp">
          <Link to="/" className="mb-8 inline-flex items-center gap-2 lg:hidden">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-indigo-600 text-white">
              <Rocket className="h-5 w-5" />
            </span>
            <span className="text-lg font-bold text-slate-900">Growth Circle</span>
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">Sign in to your account</h1>
          <p className="mt-1.5 text-sm text-slate-500">
            Don’t have an account?{' '}
            <Link to="/register" className="font-semibold text-primary-600 hover:text-primary-700">
              Request access
            </Link>
          </p>

          <form onSubmit={onSubmit} className="mt-8 space-y-4" noValidate>
            {error && (
              <div
                className={`rounded-xl border p-3.5 text-sm ${
                  ['PENDING_APPROVAL', 'ACCOUNT_REJECTED', 'ACCOUNT_SUSPENDED'].includes(code)
                    ? 'border-amber-200 bg-amber-50 text-amber-800'
                    : 'border-rose-200 bg-rose-50 text-rose-700'
                }`}
                role="alert"
              >
                <p>{error}</p>
                {code && ['PENDING_APPROVAL', 'ACCOUNT_REJECTED', 'ACCOUNT_SUSPENDED'].includes(code) && (
                  <button type="button" onClick={goToStatus} className="mt-1.5 font-semibold underline">
                    View account status
                  </button>
                )}
              </div>
            )}

            <Field label="Email or username" required error={fieldErrors.identifier}>
              <Input
                value={form.identifier}
                onChange={(e) => setForm({ ...form, identifier: e.target.value })}
                placeholder="you@example.com"
                autoComplete="username"
                autoFocus
                error={fieldErrors.identifier}
              />
            </Field>

            <Field label="Password" required error={fieldErrors.password}>
              <div className="relative">
                <Input
                  type={show ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  error={fieldErrors.password}
                  className="pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShow(!show)}
                  aria-label={show ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </Field>

            <SubmitButton busy={busy}>Sign in</SubmitButton>
          </form>
        </div>
      </div>
    </div>
  );
}
