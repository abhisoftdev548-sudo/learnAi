import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, CheckCircle2, XCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Field, Input, Textarea, SubmitButton } from '../../components/Form';
import BrandLogo from '../../components/BrandLogo';

function Rule({ ok, children }) {
  return (
    <li className={`flex items-center gap-1.5 text-xs ${ok ? 'text-emerald-600' : 'text-slate-400'}`}>
      {ok ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
      {children}
    </li>
  );
}

export default function Register() {
  const { register, authStatus } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '', username: '', email: '', password: '', confirmPassword: '', bio: '',
  });
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    document.title = 'Request access · Growth Circle';
  }, []);

  if (authStatus === 'in') navigate('/dashboard', { replace: true });

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const onPhoto = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setError('Profile photo must be 2MB or smaller.');
      return;
    }
    setError('');
    setPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const pwdOk = form.password.length >= 8;
  const pwdMatch = form.password && form.password === form.confirmPassword;

  const onSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    setFieldErrors({});

    // The API validates confirmPassword as part of the registration payload.
    const payload = { ...form };
    let res;
    if (photo) {
      const fd = new FormData();
      Object.entries(payload).forEach(([k, v]) => fd.append(k, v));
      fd.append('photo', photo);
      res = await register(fd);
    } else {
      res = await register(payload);
    }

    setBusy(false);
    if (res.ok) {
      navigate('/pending', { state: { justRegistered: true, name: res.user.name } });
      return;
    }
    setError(res.message);
    if (res.code === 'VALIDATION_ERROR') {
      setFieldErrors(res.fieldErrors);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-xl">
        <Link to="/" className="mx-auto mb-8 flex w-fit items-center gap-2.5">
          <BrandLogo className="h-12 w-12" nameClassName="text-xl font-bold text-slate-900" />
        </Link>

        <div className="card p-6 sm:p-8">
          <h1 className="text-2xl font-bold text-slate-900">Request access</h1>
          <p className="mt-1.5 text-sm text-slate-500">
            Your account will be reviewed by an admin before you can enter the platform.
          </p>

          <form onSubmit={onSubmit} className="mt-7 space-y-4" noValidate>
            {error && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-sm text-rose-700" role="alert">
                {error}
              </div>
            )}

            {/* Photo */}
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 overflow-hidden rounded-full bg-gradient-to-br from-primary-500 to-indigo-600 ring-4 ring-white shadow">
                {photoPreview ? (
                  <img src={photoPreview} alt="Preview" className="h-full w-full object-cover" />
                ) : (
                  <span className="flex h-full w-full items-center justify-center text-lg font-bold text-white">
                    {form.name ? form.name.trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase() : '?'}
                  </span>
                )}
              </div>
              <div>
                <label className="btn-secondary !py-2 cursor-pointer">
                  Choose photo
                  <input type="file" accept="image/*" className="hidden" onChange={onPhoto} />
                </label>
                <p className="mt-1 text-xs text-slate-400">Optional · PNG/JPG up to 2MB</p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Full name" required error={fieldErrors.name}>
                <Input value={form.name} onChange={set('name')} placeholder="Jane Doe" maxLength={60} error={fieldErrors.name} />
              </Field>
              <Field label="Username" required error={fieldErrors.username} hint="letters, numbers, underscore">
                <Input value={form.username} onChange={set('username')} placeholder="jane_doe" maxLength={30} error={fieldErrors.username} />
              </Field>
            </div>

            <Field label="Email" required error={fieldErrors.email}>
              <Input type="email" value={form.email} onChange={set('email')} placeholder="jane@team.com" error={fieldErrors.email} />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Password" required error={fieldErrors.password}>
                <div className="relative">
                  <Input
                    type={show ? 'text' : 'password'}
                    value={form.password}
                    onChange={set('password')}
                    placeholder="At least 8 characters"
                    autoComplete="new-password"
                    className="pr-11"
                    error={fieldErrors.password}
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
              <Field label="Confirm password" required error={fieldErrors.confirmPassword}>
                <Input
                  type={show ? 'text' : 'password'}
                  value={form.confirmPassword}
                  onChange={set('confirmPassword')}
                  placeholder="Repeat password"
                  autoComplete="new-password"
                  error={fieldErrors.confirmPassword}
                />
              </Field>
            </div>

            <ul className="flex flex-wrap gap-x-4 gap-y-1">
              <Rule ok={pwdOk}>At least 8 characters</Rule>
              <Rule ok={!!form.confirmPassword && pwdMatch}>Passwords match</Rule>
            </ul>

            <Field label="Short bio" hint="Optional — what are you learning right now?">
              <Textarea rows={3} value={form.bio} onChange={set('bio')} placeholder="Frontend developer exploring design systems…" maxLength={200} />
            </Field>

            <SubmitButton busy={busy}>Create account</SubmitButton>

            <p className="text-center text-sm text-slate-500">
              Already have an account?{' '}
              <Link to="/login" className="font-semibold text-primary-600 hover:text-primary-700">Sign in</Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
