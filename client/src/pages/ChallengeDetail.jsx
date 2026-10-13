import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  ArrowLeft, Trophy, Clock, Calendar, ExternalLink, Send, Upload, X,
  CheckCircle2, History, User2, FileText,
} from 'lucide-react';
import api, { apiError } from '../services/api';
import { PageLoader, Spinner } from '../components/Spinner';
import StatusBadge from '../components/StatusBadge';
import { Field, Input, Textarea, SubmitButton } from '../components/Form';
import {
  formatDateTime, remainingTime, CATEGORY_LABELS, DIFFICULTY_LABELS, statusLabel,
} from '../utils/format';

/** Input control for a single challenge requirement. */
function RequirementInput({ req, value, onChange, error }) {
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  const uploadFile = async (file) => {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image must be 2MB or smaller');
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const { data } = await api.post('/submissions/upload', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      onChange({ ...value, value: data.data.url, fileName: data.data.fileName });
      toast.success('File uploaded');
    } catch (e) {
      toast.error(apiError(e));
    } finally {
      setUploading(false);
    }
  };

  if (req.type === 'text') {
    return (
      <Textarea
        rows={4}
        value={value.value || ''}
        onChange={(e) => onChange({ ...value, value: e.target.value })}
        placeholder={req.help || 'Write your answer / explanation…'}
        maxLength={req.max_length || 2000}
        error={error}
      />
    );
  }

  const isFile = req.type === 'image' || req.type === 'file';
  const placeholders = {
    github: 'https://github.com/you/repository',
    liveUrl: 'https://your-project.example.com',
    linkedin: 'https://www.linkedin.com/posts/…',
    drive: 'https://drive.google.com/…',
    image: 'Image URL or upload a file',
    file: 'Document URL or upload a file',
  };

  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <Input
        value={value.value || ''}
        onChange={(e) => onChange({ ...value, value: e.target.value })}
        placeholder={placeholders[req.type] || 'https://…'}
        error={error}
        className="flex-1"
      />
      {isFile && (
        <>
          <input
            ref={fileRef}
            type="file"
            className="hidden"
            accept="image/*"
            onChange={(e) => uploadFile(e.target.files?.[0])}
          />
          <button type="button" className="btn-secondary shrink-0" onClick={() => fileRef.current?.click()} disabled={uploading}>
            {uploading ? <Spinner className="h-4 w-4" /> : <Upload className="h-4 w-4" />}
            Upload
          </button>
        </>
      )}
      {value.fileName && (
        <span className="badge bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20 self-center">
          <CheckCircle2 className="h-3 w-3" /> {value.fileName}
          <button type="button" onClick={() => onChange({ value: '', fileName: '' })} aria-label="Remove file">
            <X className="h-3 w-3" />
          </button>
        </span>
      )}
    </div>
  );
}

export default function ChallengeDetail() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState('');
  const [answers, setAnswers] = useState({});
  const [fieldErrors, setFieldErrors] = useState({});
  const [busy, setBusy] = useState(false);

  const load = () => {
    api.get(`/challenges/${id}`)
      .then((r) => {
        setData(r.data.data.challenge);
        setHistory(r.data.data.history || []);
      })
      .catch((e) => setError(apiError(e)));
  };

  useEffect(load, [id]);

  const c = data;
  const canSubmit = useMemo(() => {
    if (!c) return false;
    const s = c.memberStatus;
    if (s === 'not_started' || s === 'closed') return false;
    if (s === 'submitted' || s === 'under_review' || s === 'approved') return false;
    // active | overdue(late allowed) | needs_changes | rejected(with resub)
    if (s === 'needs_changes') return true;
    if (s === 'active') return true;
    if (s === 'overdue' && c.allowLateSubmissions) return true;
    if (s === 'rejected' && c.allowResubmission) return true;
    return false;
  }, [c]);

  if (error) return <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>;
  if (!c) return <PageLoader label="Loading challenge…" />;

  const rem = remainingTime(c.deadline);

  const setAnswer = (key) => (val) => setAnswers((a) => ({ ...a, [key]: val }));

  const onSubmit = async (e) => {
    e.preventDefault();
    setFieldErrors({});
    // client-side required checks
    const errs = {};
    (c.requirements || []).forEach((r) => {
      if (r.required && !(answers[r.key]?.value || '').trim()) errs[r.key] = `"${r.label}" is required`;
    });
    if (Object.keys(errs).length) {
      setFieldErrors(errs);
      toast.error('Please fill in all required fields');
      return;
    }
    setBusy(true);
    try {
      const payload = {
        answers: (c.requirements || [])
          .filter((r) => (answers[r.key]?.value || '').trim())
          .map((r) => ({ key: r.key, type: r.type, value: answers[r.key].value, fileName: answers[r.key].fileName || '' })),
      };
      await api.post(`/submissions/challenges/${id}`, payload);
      toast.success('Submission received — good luck!');
      setAnswers({});
      load();
    } catch (err) {
      toast.error(apiError(err));
      const errs2 = {};
      (err?.response?.data?.errors || []).forEach((x) => { if (x.field) errs2[x.field] = x.message; });
      setFieldErrors(errs2);
    } finally {
      setBusy(false);
    }
  };

  const latest = c.mySubmission;

  return (
    <div className="space-y-6 animate-fadeUp">
      <Link to="/challenges" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-primary-600">
        <ArrowLeft className="h-4 w-4" /> All challenges
      </Link>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main info */}
        <div className="space-y-6 lg:col-span-2">
          <div className="card p-6">
            {c.coverImage && (
              <img src={c.coverImage} alt="" className="mb-5 aspect-video w-full rounded-xl object-contain bg-slate-50" referrerPolicy="no-referrer" />
            )}
            <div className="flex flex-wrap items-center gap-2">
              <span className="badge bg-primary-50 text-primary-700 ring-1 ring-inset ring-primary-600/20">
                {CATEGORY_LABELS[c.category] || c.category}
              </span>
              <span className="badge bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-500/20">
                {DIFFICULTY_LABELS[c.difficulty] || c.difficulty}
              </span>
              <StatusBadge status={c.memberStatus} />
            </div>
            <h1 className="mt-3 text-2xl font-bold text-slate-900">{c.title}</h1>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-slate-600">{c.description}</p>

            {c.instructions && (
              <div className="mt-5 rounded-xl border border-sky-100 bg-sky-50/60 p-4">
                <h2 className="flex items-center gap-1.5 text-sm font-semibold text-sky-900">
                  <FileText className="h-4 w-4" /> Instructions
                </h2>
                <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-sky-800">{c.instructions}</p>
              </div>
            )}

            <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Created by</p>
                <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-slate-700">
                  <User2 className="h-3.5 w-3.5 text-slate-400" /> {c.createdBy?.name || 'Admin'}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Starts</p>
                <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-slate-700">
                  <Calendar className="h-3.5 w-3.5 text-slate-400" /> {formatDateTime(c.startAt)}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Deadline</p>
                <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-slate-700">
                  <Clock className="h-3.5 w-3.5 text-slate-400" /> {formatDateTime(c.deadline)}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Max points</p>
                <p className="mt-1 flex items-center gap-1.5 text-sm font-bold text-amber-600">
                  <Trophy className="h-3.5 w-3.5" /> {c.maxPoints}
                </p>
              </div>
            </div>

            <div className={`mt-4 flex flex-wrap items-center gap-3 rounded-xl px-4 py-3 text-sm ${rem.urgent && !rem.past ? 'bg-rose-50 text-rose-700' : rem.past ? 'bg-slate-100 text-slate-500' : 'bg-primary-50 text-primary-800'}`}>
              <Clock className="h-4 w-4" />
              <span className="font-semibold">{rem.past ? 'Deadline passed' : rem.text}</span>
              {rem.past && c.allowLateSubmissions && <span className="badge bg-emerald-100 text-emerald-700 ring-1 ring-inset ring-emerald-600/20">Late submissions enabled</span>}
              {!rem.past && c.allowLateSubmissions && <span className="text-xs opacity-70">· late submissions allowed</span>}
            </div>

            {c.referenceLinks?.length > 0 && (
              <div className="mt-5">
                <h2 className="text-sm font-semibold text-slate-700">Reference links</h2>
                <ul className="mt-2 space-y-1.5">
                  {c.referenceLinks.map((l) => (
                    <li key={l}>
                      <a href={l} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-sm text-primary-600 hover:underline">
                        <ExternalLink className="h-3.5 w-3.5" /> {l}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Submission form */}
          <div className="card p-6">
            <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
              <Send className="h-4 w-4 text-primary-500" />
              {latest && latest.attempt > 1 ? `Resubmission (attempt #${latest.attempt + 1})` : 'Submit your work'}
            </h2>

            {!canSubmit ? (
              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                {latest && ['submitted', 'under_review'].includes(latest.status)
                  ? 'Your submission is awaiting review — you’ll see feedback here once an admin scores it.'
                  : latest?.status === 'approved'
                    ? 'Your submission has been approved 🎉 — resubmissions are disabled for this challenge.'
                    : c.memberStatus === 'not_started'
                      ? 'This challenge has not started yet.'
                      : c.memberStatus === 'overdue'
                        ? 'The deadline has passed and late submissions are disabled for this challenge.'
                        : 'Submissions are closed for this challenge.'}
              </div>
            ) : (
              <form onSubmit={onSubmit} className="mt-4 space-y-4" noValidate>
                {Object.keys(fieldErrors).length > 0 && (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
                    Please fix the highlighted fields.
                  </div>
                )}
                {(c.requirements || []).map((r) => (
                  <Field
                    key={r.key}
                    label={`${r.label}${r.required ? '' : ' (optional)'}`}
                    required={r.required}
                    error={fieldErrors[r.key]}
                    hint={r.help || undefined}
                  >
                    <RequirementInput
                      req={r}
                      value={answers[r.key] || {}}
                      onChange={setAnswer(r.key)}
                      error={fieldErrors[r.key]}
                    />
                  </Field>
                ))}
                <div className="flex items-center justify-between gap-3 pt-2">
                  <p className="text-xs text-slate-400">
                    {c.allowResubmission ? 'Resubmissions allowed until the deadline.' : 'Check everything before submitting — resubmission may be disabled.'}
                  </p>
                  <SubmitButton busy={busy} className="btn-primary">
                    <Send className="h-4 w-4" /> Submit work
                  </SubmitButton>
                </div>
              </form>
            )}

            {latest && (
              <div className="mt-6 rounded-xl border border-slate-200 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-700">Current submission (attempt #{latest.attempt})</p>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={latest.status} />
                    {latest.score != null && (
                      <span className="text-sm font-bold text-emerald-600">{latest.score}/{c.maxPoints} pts</span>
                    )}
                  </div>
                </div>
                <p className="mt-1 text-xs text-slate-400">
                  Submitted {formatDateTime(latest.submittedAt)} · {latest.isOnTime ? 'on time' : 'late'}
                </p>
                {latest.feedback && (
                  <div className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
                    <span className="font-semibold">Admin feedback: </span>{latest.feedback}
                  </div>
                )}
                <ul className="mt-3 space-y-1.5">
                  {latest.answers.map((a) => (
                    <li key={a.key} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                      <span className="text-slate-600 break-all">
                        {a.value?.startsWith('http') ? (
                          <a href={a.value} target="_blank" rel="noreferrer" className="text-primary-600 hover:underline">{a.value}</a>
                        ) : a.value}
                        {a.fileName ? <span className="ml-1 text-xs text-slate-400">({a.fileName})</span> : null}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Side panel */}
        <div className="space-y-6">
          <div className="card p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Submission requirements</h2>
            <ol className="mt-3 space-y-3">
              {(c.requirements || []).map((r, i) => (
                <li key={r.key} className="flex gap-3 text-sm">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-xs font-bold text-primary-700">
                    {i + 1}
                  </span>
                  <div>
                    <p className="font-medium text-slate-700">{r.label}{r.required ? '' : ' (optional)'}</p>
                    <p className="text-xs capitalize text-slate-400">{r.type === 'liveUrl' ? 'live url' : r.type}</p>
                  </div>
                </li>
              ))}
              {(c.requirements || []).length === 0 && (
                <li className="text-sm text-slate-400">No requirements configured.</li>
              )}
            </ol>
            <p className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-400">
              Total submissions: <span className="font-bold text-slate-600">{c.submissionCount}</span>
            </p>
          </div>

          {/* History */}
          <div className="card p-5">
            <h2 className="flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wide text-slate-400">
              <History className="h-4 w-4" /> Submission history
            </h2>
            {history.length === 0 ? (
              <p className="mt-3 text-sm text-slate-400">No submissions yet.</p>
            ) : (
              <ol className="mt-3 space-y-3">
                {history.map((h) => (
                  <li key={h.id} className="rounded-xl border border-slate-100 p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-slate-700">Attempt #{h.attempt}</span>
                      <StatusBadge status={h.status} />
                    </div>
                    <p className="mt-1 text-xs text-slate-400">{formatDateTime(h.submittedAt)} · {h.isOnTime ? 'on time' : 'late'}</p>
                    {h.score != null && <p className="mt-1 text-sm font-bold text-emerald-600">{h.score} points</p>}
                    {h.feedback && <p className="mt-1.5 text-xs text-slate-500">“{h.feedback}”</p>}
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
