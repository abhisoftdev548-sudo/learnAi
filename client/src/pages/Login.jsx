import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, KeyRound, User } from 'lucide-react';
import { AppLayout } from '../components/layout/AppLayout.jsx';
import { PageContainer } from '../components/ui/Layout.jsx';
import { TextField } from '../components/ui/Controls.jsx';
import Button from '../components/ui/Button.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';

export function Login() {
  useDocumentTitle('Sign in');
  const { login, isAuthenticated, loading } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ identifier: '', password: '' });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const redirectTo = location.state?.from ?? '/dashboard';

  if (!loading && isAuthenticated) return <Navigate to={redirectTo} replace />;

  const submit = async (event) => {
    event.preventDefault();
    const nextErrors = {};
    if (!form.identifier.trim()) nextErrors.identifier = 'Enter your username or email.';
    if (!form.password) nextErrors.password = 'Enter your password.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    setSubmitting(true);
    try {
      const session = await login(form.identifier.trim(), form.password);
      toast.success(`Welcome back, ${session?.user?.name?.split(' ')[0] ?? 'developer'}!`);
      navigate(redirectTo, { replace: true });
    } catch (error) {
      const message = error.status === 401 ? 'Those credentials do not match our records.' : error.message;
      setErrors({ form: message });
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppLayout>
      <PageContainer className="flex min-h-[70vh] items-center">
        <div className="mx-auto grid w-full max-w-5xl gap-8 lg:grid-cols-2 lg:items-center">
          <div className="hidden lg:block">
            <h1 className="text-3xl font-semibold tracking-tight text-ink-900">Welcome back to your practice log</h1>
            <p className="mt-3 text-sm text-ink-600">
              Pick up where you left off — your streak, XP and unfinished challenges are waiting.
            </p>
            <ul className="mt-6 space-y-3 text-sm text-ink-600">
              <li>· 12 challenges across HTML, CSS and JavaScript</li>
              <li>· Instant scoring on structure, styling, behaviour, responsiveness and quality</li>
              <li>· Weekly, monthly and all-time team rankings</li>
            </ul>
          </div>

          <div className="card mx-auto w-full max-w-md p-6 sm:p-7">
            <h2 className="text-xl font-semibold text-ink-900">Sign in</h2>
            <p className="mt-1 text-sm text-ink-500">Use your username or email address.</p>

            <form className="mt-6 space-y-4" onSubmit={submit} noValidate>
              <TextField
                label="Username or email"
                name="identifier"
                autoComplete="username"
                icon={User}
                value={form.identifier}
                error={errors.identifier}
                onChange={(event) => setForm((current) => ({ ...current, identifier: event.target.value }))}
                placeholder="maya"
                required
              />
              <TextField
                label="Password"
                name="password"
                type="password"
                autoComplete="current-password"
                icon={KeyRound}
                value={form.password}
                error={errors.password}
                onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                placeholder="••••••••"
                required
              />

              {errors.form ? (
                <p role="alert" className="rounded-xl border border-rose-100 bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700">
                  {errors.form}
                </p>
              ) : null}

              <Button type="submit" className="w-full" size="lg" loading={submitting} iconRight={ArrowRight}>
                Sign in
              </Button>
            </form>

            <p className="mt-5 text-center text-sm text-ink-500">
              New to the team?{' '}
              <Link to="/register" className="font-semibold text-brand-600 hover:text-brand-700">
                Create an account
              </Link>
            </p>

            <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-3.5">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">Demo accounts</p>
              <p className="mt-1.5 text-xs text-ink-600">
                Member: <code className="font-mono text-ink-800">maya</code> / <code className="font-mono text-ink-800">Practice@123</code>
                <br />
                Admin: <code className="font-mono text-ink-800">admin</code> / <code className="font-mono text-ink-800">Admin@12345</code>
              </p>
            </div>
          </div>
        </div>
      </PageContainer>
    </AppLayout>
  );
}

export default Login;
