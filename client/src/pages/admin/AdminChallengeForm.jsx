import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeft, Plus, X, Save, Rocket, Link2 } from 'lucide-react';
import api, { apiError, uploadImages } from '../../services/api';
import { PageLoader, Spinner } from '../../components/Spinner';
import { Field, Input, Textarea, Select, SubmitButton } from '../../components/Form';
import { CATEGORIES, DIFFICULTIES, SUBMISSION_TYPES } from '../../utils/constants';
import { localDateTimeToIso } from '../../utils/datetime';
import AdminNav from './AdminNav';

const TYPE_LABELS = {
  github: 'GitHub repository URL',
  liveUrl: 'Live project URL',
  linkedin: 'LinkedIn post URL',
  drive: 'Google Drive URL',
  image: 'Image (URL or upload)',
  file: 'Document / file (URL or upload)',
  text: 'Text explanation',
};

const toLocalInput = (d) => {
  if (!d) return '';
  const x = new Date(d);
  const pad = (n) => String(n).padStart(2, '0');
  return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}T${pad(x.getHours())}:${pad(x.getMinutes())}`;
};

export default function AdminChallengeForm() {
  const { id } = useParams(); // present when editing
  const navigate = useNavigate();
  const editing = !!id;
  const [loading, setLoading] = useState(editing);
  const [busy, setBusy] = useState(false);
  const [publishBusy, setPublishBusy] = useState(false);
  const [error, setError] = useState('');
  const [coverFile, setCoverFile] = useState(null);

  const empty = {
    title: '', description: '', instructions: '', category: 'coding', difficulty: 'medium',
    startAt: toLocalInput(new Date()), deadline: toLocalInput(new Date(Date.now() + 7 * 86400000)),
    maxPoints: 100, requirements: [{ label: 'GitHub repository', type: 'github', required: true, help: '' }],
    referenceLinks: [], coverImage: '', allowLateSubmissions: false, allowResubmission: false,
    communityVisibility: 'auto', status: 'draft',
  };
  const [form, setForm] = useState(empty);

  useEffect(() => {
    if (!editing) return;
    api.get(`/challenges/${id}`)
      .then((r) => {
        const c = r.data.data.challenge;
        setForm({
          title: c.title,
          description: c.description,
          instructions: c.instructions || '',
          category: c.category,
          difficulty: c.difficulty,
          startAt: toLocalInput(c.startAt),
          deadline: toLocalInput(c.deadline),
          maxPoints: c.maxPoints,
          requirements: c.requirements?.length ? c.requirements : empty.requirements,
          referenceLinks: c.referenceLinks || [],
          coverImage: c.coverImage || '',
          allowLateSubmissions: c.allowLateSubmissions,
          allowResubmission: c.allowResubmission,
          communityVisibility: c.communityVisibility,
          status: c.status,
        });
      })
      .catch((e) => setError(apiError(e)))
      .finally(() => setLoading(false));
  }, [id, editing]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  const setReq = (i, patch) => {
    const requirements = form.requirements.map((r, j) => (i === j ? { ...r, ...patch } : r));
    setForm({ ...form, requirements });
  };

  const validate = () => {
    if (form.title.trim().length < 3) return 'Title must be at least 3 characters';
    if (!form.description.trim()) return 'Description is required';
    if (!form.startAt || !form.deadline) return 'Start and deadline are required';
    if (new Date(form.deadline) <= new Date(form.startAt)) return 'Deadline must be after the start date';
    if (!form.maxPoints || form.maxPoints < 1 || form.maxPoints > 1000) return 'Max points must be 1-1000';
    if (form.requirements.length === 0) return 'Add at least one submission requirement';
    for (const r of form.requirements) {
      if (!r.label?.trim()) return 'Every requirement needs a label';
    }
    return null;
  };

  const save = async (nextStatus) => {
    const v = validate();
    if (v) { toast.error(v); return null; }
    setBusy(nextStatus !== undefined);
    setPublishBusy(nextStatus === 'published');
    try {
      const payload = {
        ...form,
        startAt: localDateTimeToIso(form.startAt),
        deadline: localDateTimeToIso(form.deadline),
        requirements: form.requirements.map((r, i) => ({ key: `req_${i + 1}`, ...r })),
        referenceLinks: form.referenceLinks.filter(Boolean),
        ...(nextStatus ? { status: nextStatus } : {}),
      };
      if (coverFile) payload.coverImage = (await uploadImages([coverFile]))[0];
      const { data } = editing
        ? await api.patch(`/challenges/${id}`, payload)
        : await api.post('/challenges', payload);
      toast.success(nextStatus === 'published' ? 'Challenge published 🎉' : 'Challenge saved');
      return data.data.challenge.id;
    } catch (e) {
      toast.error(apiError(e));
      return null;
    } finally {
      setBusy(false);
      setPublishBusy(false);
    }
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    const savedId = await save(editing ? undefined : 'draft');
    if (savedId) navigate('/admin/challenges');
  };

  const onPublish = async () => {
    const savedId = await save('published');
    if (savedId) navigate('/admin/challenges');
  };

  if (loading) return <PageLoader label="Loading challenge…" />;
  if (error) return <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>;

  return (
    <div className="mx-auto max-w-3xl space-y-6 animate-fadeUp">
      <AdminNav />

      <Link to="/admin/challenges" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-primary-600">
        <ArrowLeft className="h-4 w-4" /> All challenges
      </Link>

      <form onSubmit={onSubmit} className="card space-y-5 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl font-bold text-slate-900">{editing ? 'Edit challenge' : 'Create challenge'}</h1>
          {editing && <span className="badge bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-500/20 capitalize">{form.status}</span>}
        </div>

        <Field label="Title" required>
          <Input value={form.title} onChange={set('title')} placeholder="e.g. Build a Portfolio Website" maxLength={140} />
        </Field>

        <Field label="Description" required hint="What should members achieve?">
          <Textarea rows={4} value={form.description} onChange={set('description')} maxLength={5000} />
        </Field>
        <Field label="Cover image" hint="Optional URL or upload (PNG, JPG, WEBP, GIF)">
          <Input value={form.coverImage} onChange={set('coverImage')} placeholder="https://…" />
          <input className="mt-2" type="file" accept="image/*" onChange={(e) => setCoverFile(e.target.files?.[0] || null)} />
        </Field>

        <Field label="Instructions" hint="Step-by-step guidance (optional)">
          <Textarea rows={4} value={form.instructions} onChange={set('instructions')} maxLength={8000} />
        </Field>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Category" required>
            <Select value={form.category} onChange={set('category')}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c.replace(/-/g, ' ')}</option>)}
            </Select>
          </Field>
          <Field label="Difficulty">
            <Select value={form.difficulty} onChange={set('difficulty')}>
              {DIFFICULTIES.map((d) => <option key={d} value={d}>{d}</option>)}
            </Select>
          </Field>
          <Field label="Max points" required>
            <Input type="number" min={1} max={1000} value={form.maxPoints} onChange={set('maxPoints')} />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Start date & time" required>
            <Input type="datetime-local" value={form.startAt} onChange={set('startAt')} />
          </Field>
          <Field label="Deadline" required>
            <Input type="datetime-local" value={form.deadline} onChange={set('deadline')} />
          </Field>
        </div>

        {/* Requirements builder */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="label !mb-0">Submission requirements <span className="text-rose-500">*</span></p>
            {form.requirements.length < 10 && (
              <button
                type="button"
                className="btn-secondary !py-1.5 !text-xs"
                onClick={() => setForm({ ...form, requirements: [...form.requirements, { label: '', type: 'text', required: true, help: '' }] })}
              >
                <Plus className="h-3.5 w-3.5" /> Add requirement
              </button>
            )}
          </div>
          <div className="space-y-3">
            {form.requirements.map((r, i) => (
              <div key={i} className="rounded-xl border border-slate-200 p-3">
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input placeholder="Label (e.g. GitHub repository)" value={r.label} onChange={(e) => setReq(i, { label: e.target.value })} />
                  <Select value={r.type} onChange={(e) => setReq(i, { type: e.target.value })} className="sm:!w-56">
                    {SUBMISSION_TYPES.map((t) => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
                  </Select>
                  <label className="flex shrink-0 items-center gap-2 px-1 text-sm text-slate-600">
                    <input type="checkbox" checked={r.required !== false} onChange={(e) => setReq(i, { required: e.target.checked })} className="h-4 w-4 rounded accent-primary-600" />
                    Required
                  </label>
                  <button type="button" className="btn-ghost !px-2 !text-rose-500" aria-label="Remove requirement"
                    onClick={() => setForm({ ...form, requirements: form.requirements.filter((_, j) => j !== i) })}>
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <Input className="mt-2" placeholder="Help text (optional)" value={r.help || ''} onChange={(e) => setReq(i, { help: e.target.value })} />
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-slate-400">
            Example: a website challenge → GitHub repo (required) + Live URL (required) + Screenshot (required).
          </p>
        </div>

        {/* Reference links */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="label !mb-0">Reference links</p>
            {form.referenceLinks.length < 10 && (
              <button type="button" className="btn-secondary !py-1.5 !text-xs"
                onClick={() => setForm({ ...form, referenceLinks: [...form.referenceLinks, ''] })}>
                <Link2 className="h-3.5 w-3.5" /> Add link
              </button>
            )}
          </div>
          <div className="space-y-2">
            {form.referenceLinks.map((l, i) => (
              <div key={i} className="flex gap-2">
                <Input value={l} placeholder="https://…" onChange={(e) => {
                  const referenceLinks = [...form.referenceLinks];
                  referenceLinks[i] = e.target.value;
                  setForm({ ...form, referenceLinks });
                }} />
                <button type="button" className="btn-ghost !px-2" aria-label="Remove link"
                  onClick={() => setForm({ ...form, referenceLinks: form.referenceLinks.filter((_, j) => j !== i) })}>
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Rules */}
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex items-start gap-2.5 rounded-xl border border-slate-200 p-3 text-sm text-slate-600">
            <input type="checkbox" checked={form.allowLateSubmissions} onChange={set('allowLateSubmissions')} className="mt-0.5 h-4 w-4 rounded accent-primary-600" />
            <span>
              <span className="block font-semibold text-slate-800">Allow late submissions</span>
              Members can submit after the deadline (marked late).
            </span>
          </label>
          <label className="flex items-start gap-2.5 rounded-xl border border-slate-200 p-3 text-sm text-slate-600">
            <input type="checkbox" checked={form.allowResubmission} onChange={set('allowResubmission')} className="mt-0.5 h-4 w-4 rounded accent-primary-600" />
            <span>
              <span className="block font-semibold text-slate-800">Allow resubmissions</span>
              Members can submit again after a review (or rejection).
            </span>
          </label>
        </div>

        <Field label="Community visibility" hint="Auto = approved submissions appear in the community feed">
          <Select value={form.communityVisibility} onChange={set('communityVisibility')}>
            <option value="auto">Auto-publish approved submissions</option>
            <option value="private">Keep submissions private</option>
          </Select>
        </Field>

        <div className="flex flex-wrap justify-end gap-3 border-t border-slate-100 pt-4">
          <Link to="/admin/challenges" className="btn-secondary">Cancel</Link>
          <SubmitButton busy={busy} className="btn-secondary" disabled={publishBusy}>
            <Save className="h-4 w-4" /> Save {editing ? '' : 'as draft'}
          </SubmitButton>
          <button type="button" className="btn-primary" onClick={onPublish} disabled={busy || publishBusy}>
            {(busy || publishBusy) && <Spinner className="h-4 w-4" />}
            <Rocket className="h-4 w-4" /> {editing && form.status === 'published' ? 'Save & keep published' : 'Publish challenge'}
          </button>
        </div>
      </form>
    </div>
  );
}
