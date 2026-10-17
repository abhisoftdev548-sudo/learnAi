import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeft, Save, Rocket, Plus, X } from 'lucide-react';
import api, { apiError, uploadImages } from '../../services/api';
import { PageLoader, Spinner } from '../../components/Spinner';
import { Field, Input, Textarea, SubmitButton } from '../../components/Form';
import { localDateTimeToIso } from '../../utils/datetime';
import AdminNav from './AdminNav';

const toLocalInput = (d) => {
  if (!d) return '';
  const x = new Date(d);
  const pad = (n) => String(n).padStart(2, '0');
  return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}T${pad(x.getHours())}:${pad(x.getMinutes())}`;
};

const inDays = (n) => toLocalInput(new Date(Date.now() + n * 86400000));

export default function AdminPollForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const editing = !!id;
  const [loading, setLoading] = useState(editing);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [image, setImage] = useState('');

  const empty = {
    question: '', description: '', options: ['', ''],
    startsAt: toLocalInput(new Date()), endsAt: inDays(7),
    anonymous: false, allowMultiple: false, allowChangeVote: true, rewardPoints: 0,
    visibility: 'team', resultsVisibility: 'immediate',
  };
  const [form, setForm] = useState(empty);

  useEffect(() => {
    if (!editing) return;
    api.get(`/polls/${id}`)
      .then((r) => {
        const p = r.data.data.poll;
        setImage(p.image || '');
        setForm({
          question: p.question, description: p.description || '',
          options: p.options.map((o) => o.text),
          image: p.image || '',
          startsAt: toLocalInput(p.startsAt), endsAt: toLocalInput(p.endsAt),
          anonymous: p.anonymous, allowMultiple: p.allowMultiple, allowChangeVote: p.allowChangeVote,
          visibility: p.visibility, resultsVisibility: p.resultsVisibility, rewardPoints: p.rewardPoints || 0,
        });
      })
      .catch((e) => setError(apiError(e)))
      .finally(() => setLoading(false));
  }, [id, editing]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  const validate = () => {
    if (form.question.trim().length < 3) return 'Question must be at least 3 characters';
    const opts = form.options.map((o) => o.trim()).filter(Boolean);
    if (opts.length < 2) return 'At least 2 non-empty options are required';
    if (new Set(opts.map((o) => o.toLowerCase())).size !== opts.length) return 'Options must be unique';
    if (opts.some((o) => o.length > 200)) return 'Options must be at most 200 characters';
    if (!form.startsAt || !form.endsAt) return 'Start and end times are required';
    if (new Date(form.endsAt) <= new Date(form.startsAt)) return 'End time must be after start time';
    return null;
  };

  const save = async (nextStatus) => {
    const v = validate();
    if (v) { toast.error(v); return null; }
    setBusy(true);
    try {
      const payload = {
        ...form,
        startsAt: localDateTimeToIso(form.startsAt),
        endsAt: localDateTimeToIso(form.endsAt),
        image: imageFile ? (await uploadImages([imageFile]))[0] : image,
        options: form.options.map((o) => ({ text: o.trim() })).filter((o) => o.text),
        ...(nextStatus ? { status: nextStatus } : {}),
      };
      const { data } = editing
        ? await api.patch(`/polls/${id}`, payload)
        : await api.post('/polls', payload);
      toast.success(nextStatus === 'active' ? 'Poll opened 🗳️' : 'Poll saved');
      return data.data.poll.id;
    } catch (e) {
      const details = e?.response?.data?.errors
        ?.map((item) => `${item.field}: ${item.message}`)
        .join(', ');
      toast.error(details || apiError(e));
      return null;
    } finally {
      setBusy(false);
    }
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    const saved = await save(editing ? undefined : 'draft');
    if (saved) navigate('/admin/polls');
  };

  if (loading) return <PageLoader label="Loading poll…" />;
  if (error) return <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>;

  return (
    <div className="mx-auto max-w-3xl space-y-6 animate-fadeUp">
      <AdminNav />

      <Link to="/admin/polls" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-primary-600">
        <ArrowLeft className="h-4 w-4" /> All polls
      </Link>

      <form onSubmit={onSubmit} className="card space-y-5 p-6">
        <h1 className="text-xl font-bold text-slate-900">{editing ? 'Edit poll' : 'Create poll'}</h1>

        <Field label="Question" required>
          <Input value={form.question} onChange={set('question')} placeholder="Which topic next week?" maxLength={300} />
        </Field>

        <Field label="Description" hint="Optional context">
          <Textarea rows={2} value={form.description} onChange={set('description')} maxLength={1000} />
        </Field>
        <Field label="Image" hint="Optional PNG, JPG, WEBP or GIF up to 2MB">
          <input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] || null)} />
          {image && <img src={image} alt="Poll preview" className="mt-2 h-28 rounded-lg object-cover" />}
        </Field>

        <div>
          <p className="label">Options <span className="text-rose-500">*</span></p>
          <div className="space-y-2">
            {form.options.map((o, i) => (
              <div key={i} className="flex gap-2">
                <Input value={o} placeholder={`Option ${i + 1}`} maxLength={200}
                  onChange={(e) => {
                    const options = [...form.options];
                    options[i] = e.target.value;
                    setForm({ ...form, options });
                  }} />
                {form.options.length > 2 && (
                  <button type="button" className="btn-ghost !px-2" aria-label="Remove option"
                    onClick={() => setForm({ ...form, options: form.options.filter((_, j) => j !== i) })}>
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
          {form.options.length < 10 && (
            <button type="button" className="btn-secondary mt-2 !py-2 !text-xs"
              onClick={() => setForm({ ...form, options: [...form.options, ''] })}>
              <Plus className="h-3.5 w-3.5" /> Add option
            </button>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Voting opens" required>
            <Input type="datetime-local" value={form.startsAt} onChange={set('startsAt')} />
          </Field>
          <Field label="Voting closes" required>
            <Input type="datetime-local" value={form.endsAt} onChange={set('endsAt')} />
          </Field>
          <Field label="Points for voting" hint="Awarded automatically once per member">
            <Input type="number" min={0} max={10000} value={form.rewardPoints} onChange={set('rewardPoints')} />
          </Field>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <label className="flex items-start gap-2.5 rounded-xl border border-slate-200 p-3 text-sm text-slate-600">
            <input type="checkbox" checked={form.anonymous} onChange={set('anonymous')} className="mt-0.5 h-4 w-4 rounded accent-primary-600" />
            <span><span className="block font-semibold text-slate-800">Anonymous</span>Voter identities hidden</span>
          </label>
          <label className="flex items-start gap-2.5 rounded-xl border border-slate-200 p-3 text-sm text-slate-600">
            <input type="checkbox" checked={form.allowMultiple} onChange={set('allowMultiple')} className="mt-0.5 h-4 w-4 rounded accent-primary-600" />
            <span><span className="block font-semibold text-slate-800">Multi-choice</span>Members pick several options</span>
          </label>
          <label className="flex items-start gap-2.5 rounded-xl border border-slate-200 p-3 text-sm text-slate-600">
            <input type="checkbox" checked={form.allowChangeVote} onChange={set('allowChangeVote')} className="mt-0.5 h-4 w-4 rounded accent-primary-600" />
            <span><span className="block font-semibold text-slate-800">Changeable</span>Members can switch their vote</span>
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Visibility">
            <select className="input" value={form.visibility} onChange={set('visibility')}>
              <option value="team">Whole team</option>
              <option value="admins">Admins only</option>
            </select>
          </Field>
          <Field label="Results visibility">
            <select className="input" value={form.resultsVisibility} onChange={set('resultsVisibility')}>
              <option value="immediate">Visible immediately</option>
              <option value="after_close">Hidden until poll closes</option>
            </select>
          </Field>
        </div>

        <div className="flex flex-wrap justify-end gap-3 border-t border-slate-100 pt-4">
          <Link to="/admin/polls" className="btn-secondary">Cancel</Link>
          <SubmitButton busy={busy} className="btn-secondary"><Save className="h-4 w-4" /> Save</SubmitButton>
          <button type="button" className="btn-primary" disabled={busy}
            onClick={async () => { const saved = await save('active'); if (saved) navigate('/admin/polls'); }}>
            {busy && <Spinner className="h-4 w-4" />} <Rocket className="h-4 w-4" /> {editing ? 'Save & open voting' : 'Open voting now'}
          </button>
        </div>
      </form>
    </div>
  );
}
