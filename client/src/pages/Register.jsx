import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { ArrowRight, AtSign, KeyRound, User, UserRound } from 'lucide-react';
import { AppLayout } from '../components/layout/AppLayout.jsx';
import { PageContainer } from '../components/ui/Layout.jsx';
import { TextField } from '../components/ui/Controls.jsx';
import Button from '../components/ui/Button.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';

const USERNAME_PATTERN = /^[a-z0-9_.]{3,30}$/;

function validate(form) {
  const errors = {};
  if (form.name.trim().length < 2) errors.name = 'Please enter your full name.';
  if (!USERNAME_PATTERN.test(form.username.trim().toLowerCase())) {
    errors.username = '3–30 characters: letters, numbers, underscores or dots.';
  }
  if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(form.email.trim())) errors.email = 'Enter a valid email address.';
  if (!/^(?=.*[a-zA-Z])(?=.*\d).{8,}$/.test(form.password)) {
    errors.password = 'At least 8 characters with a letter and a number.';
  }
  if (form.confirm !== form.password) errors.confirm = 'Both passwords must match.';
  return errors;
}

export function Register() {
  useDocumentTitle('Create account');
  const { register, isAuthenticated, loading } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', username: '', email: '', password: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  if (!loading && isAuthenticated) return <Navigate to="/dashboard" replace />;

  const update = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));

  const submit = async (event) => {
    event.preventDefault();
    const nextErrors = validate(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    setSubmitting(true);
    try {
      const session = await register({
        name: form.name.trim(),
        username: form.username.trim().toLowerCase(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
      });
      toast.success(`Account created — welcome, ${session?.user?.name?.split(' ')[0] ?? 'developer'}!`);
      navigate('/dashboard', { replace: true });
    } catch (error) {
      if (error.isValidationError && Array.isArray(error.details)) {
        const fieldErrors = {};
        for (const detail of error.details) fieldErrors[detail.field] = detail.message;
        setErrors(fieldErrors);
      }
      const message = error.status === 409 ? error.message : error.message;
      setErrors((current) => ({ ...current, form: message }));
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
            <h1 className="text-3xl font-semibold tracking-tight text-ink-900">Start your practice streak today</h1>
            <p className="mt-3 text-sm text-ink-600">
              Create an account to submit solutions, earn XP and unlock achievements as you work through the catalogue.
            </p>
            <ul className="mt-6 space-y-3 text-sm text-ink-600">
              <li>· Workspace with Monaco editor and a live sandboxed preview</li>
              <li>· Score breakdown after every attempt, with hints available</li>
              <li>· Practice calendar, streaks and team leaderboard</li>
            </ul>
          </div>

          <div className="card mx-auto w-full max-w-md p-6 sm:p-7">
            <h2 className="text-xl font-semibold text-ink-900">Create your account</h2>
            <p className="mt-1 text-sm text-ink-500">It takes less than a minute.</p>

            <form className="mt-6 space-y-4" onSubmit={submit} noValidate>
              <TextField
                label="Full name"
                icon={UserRound}
                value={form.name}
                error={errors.name}
                onChange={update('name')}
                placeholder="Maya Chen"
                autoComplete="name"
                required
              />
              <TextField
                label="Username"
                icon={AtSign}
                value={form.username}
                error={errors.username}
                onChange={update('username')}
                placeholder="maya"
                autoComplete="username"
                required
              />
              <TextField
                label="Email"
                type="email"
                icon={User}
                value={form.email}
                error={errors.email}
                onChange={update('email')}
                placeholder="maya@team.io"
                autoComplete="email"
                required
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <TextField
                  label="Password"
                  type="password"
                  icon={KeyRound}
                  value={form.password}
                  error={errors.password}
                  onChange={update('password')}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  required
                />
                <TextField
                  label="Confirm password"
                  type="password"
                  value={form.confirm}
                  error={errors.confirm}
                  onChange={update('confirm')}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  required
                />
              </div>

              {errors.form ? (
                <p role="alert" className="rounded-xl border border-rose-100 bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700">
                  {errors.form}
                </p>
              ) : null}

              <Button type="submit" className="w-full" size="lg" loading={submitting} iconRight={ArrowRight}>
                Create account
              </Button>
            </form>

            <p className="mt-5 text-center text-sm text-ink-500">
              Already have an account?{' '}
              <Link to="/login" className="font-semibold text-brand-600 hover:text-brand-700">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </PageContainer>
    </AppLayout>
  );
}

export default Register;
