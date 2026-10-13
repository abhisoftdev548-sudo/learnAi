import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeft, Save, Rocket, Video, Lock, Link2, X, Plus } from 'lucide-react';
import api, { apiError } from '../../services/api';
import { PageLoader, Spinner } from '../../components/Spinner';
import { Field, Input, Textarea, Select, SubmitButton } from '../../components/Form';
import { EVENT_CATEGORIES } from '../../utils/constants';
import AdminNav from './AdminNav';

const toDateInput = (d) => {
  if (!d) return '';
  const x = new Date(d);
  const pad = (n) => String(n).padStart(2, '0');
  return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`;
};

export default function AdminEventForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const editing = !!id;
  const [loading, setLoading] = useState(editing);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const empty = {
    title: '', description: '', hostName: '', category: 'team-meeting',
    date: toDateInput(new Date(Date.now() + 3 * 86400000)),
    startTime: '18:00', endTime: '19:30',
    platform: '', meetingUrl: '', coverImage: '', isPrivate: false,
    registrationDeadline: '', status: 'draft',
  };
  const [form, setForm] = useState(empty);

  useEffect(() => {
    if (!editing) return;
    api.get(`/events/${id}`)
      .then((r) => {
        const e = r.data.data.event;
        setForm({
          title: e.title, description: e.description, hostName: e.hostName, category: e.category,
          date: toDateInput(e.date), startTime: e.startTime, endTime: e.endTime,
          platform: e.platform || '', meetingUrl: e.meetingUrl || '', coverImage: e.coverImage || '',
          isPrivate: e.isPrivate, registrationDeadline: e.registrationDeadline ? toDateInput(e.registrationDeadline) : '',
          status: e.status,
        });
      })
      .catch((e) => setError(apiError(e)))
      .finally(() => setLoading(false));
  }, [id, editing]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  const validate = () => {
    if (form.title.trim().length < 3) return 'Title must be at least 3 characters';
    if (!form.description.trim()) return 'Description is required';
    if (!form.hostName.trim()) return 'Host name is required';
    if (!form.date) return 'Date is required';
    if (form.startTime >= form.endTime) return 'End time must be after start time';
    if (form.meetingUrl) {
      try { new URL(form.meetingUrl); } catch { return 'Meeting URL is invalid'; }
    }
    return null;
  };

  const save = async (nextStatus) => {
    const v = validate();
    if (v) { toast.error(v); return null; }
    setBusy(true);
    try {
      const payload = { ...form, ...(nextStatus ? { status: nextStatus } : {}) };
      const { data } = editing
        ? await api.patch(`/events/${id}`, payload)
        : await api.post('/events', payload);
      toast.success(nextStatus === 'published' ? 'Event published 📅' : 'Event saved');
      return data.data.event.id;
    } catch (e) {
      toast.error(apiError(e));
      return null;
    } finally {
      setBusy(false);
    }
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    const saved = await save(editing ? undefined : 'draft');
    if (saved) navigate('/admin/events');
  };

  if (loading) return <PageLoader label="Loading event…" />;
  if (error) return <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>;

  return (
    <div className="mx-auto max-w-3xl space-y-6 animate-fadeUp">
      <AdminNav />

      <Link to="/admin/events" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-primary-600">
        <ArrowLeft className="h-4 w-4" /> All events
      </Link>

      <form onSubmit={onSubmit} className="card space-y-5 p-6">
        <h1 className="text-xl font-bold text-slate-900">{editing ? 'Edit event' : 'Create event'}</h1>

        <Field label="Event title" required>
          <Input value={form.title} onChange={set('title')} placeholder="e.g. DSA Practice Night" maxLength={140} />
        </Field>

        <Field label="Description" required>
          <Textarea rows={4} value={form.description} onChange={set('description')} maxLength={5000} />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Host name" required>
            <Input value={form.hostName} onChange={set('hostName')} maxLength={80} />
          </Field>
          <Field label="Category" required>
            <Select value={form.category} onChange={set('category')}>
              {EVENT_CATEGORIES.map((c) => <option key={c} value={c}>{c.replace(/-/g, ' ')}</option>)}
            </Select>
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Date" required>
            <Input type="date" value={form.date} onChange={set('date')} />
          </Field>
          <Field label="Start time" required>
            <Input type="time" value={form.startTime} onChange={set('startTime')} />
          </Field>
          <Field label="End time" required>
            <Input type="time" value={form.endTime} onChange={set('endTime')} />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Meeting platform" hint="e.g. Google Meet, Zoom, Discord">
            <Input value={form.platform} onChange={set('platform')} placeholder="Google Meet" maxLength={60} />
          </Field>
          <Field label="Meeting URL" hint="Only shared with registered members when private">
            <Input value={form.meetingUrl} onChange={set('meetingUrl')} placeholder="https://…" />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Registration deadline" hint="Optional — leave empty until event day">
            <Input type="date" value={form.registrationDeadline} onChange={set('registrationDeadline')} />
          </Field>
          <Field label="Cover image URL" hint="Optional">
            <Input value={form.coverImage} onChange={set('coverImage')} placeholder="https://…" />
          </Field>
        </div>

        <label className="flex items-start gap-2.5 rounded-xl border border-slate-200 p-3 text-sm text-slate-600">
          <input type="checkbox" checked={form.isPrivate} onChange={set('isPrivate')} className="mt-0.5 h-4 w-4 rounded accent-primary-600" />
          <span>
            <span className="block font-semibold text-slate-800"><Lock className="mr-1 inline h-3.5 w-3.5" /> Private event</span>
            The meeting link is visible only to registered members (admins always see it).
          </span>
        </label>

        <div className="flex flex-wrap justify-end gap-3 border-t border-slate-100 pt-4">
          <Link to="/admin/events" className="btn-secondary">Cancel</Link>
          <SubmitButton busy={busy} className="btn-secondary"><Save className="h-4 w-4" /> Save</SubmitButton>
          <button type="button" className="btn-primary" disabled={busy}
            onClick={async () => { const saved = await save('published'); if (saved) navigate('/admin/events'); }}>
            {busy && <Spinner className="h-4 w-4" />} <Rocket className="h-4 w-4" /> Publish
          </button>
        </div>
      </form>
    </div>
  );
}
