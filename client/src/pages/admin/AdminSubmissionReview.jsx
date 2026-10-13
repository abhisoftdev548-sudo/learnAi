import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  ArrowLeft, ExternalLink, Clock, Trophy, CheckCircle2, XCircle, RotateCcw, Send,
} from 'lucide-react';
import api, { apiError } from '../../services/api';
import StatusBadge from '../../components/StatusBadge';
import Avatar from '../../components/Avatar';
import { PageLoader, Spinner } from '../../components/Spinner';
import { Field, Input, Textarea, Select } from '../../components/Form';
import { formatDateTime } from '../../utils/format';
import AdminNav from './AdminNav';

export default function AdminSubmissionReview() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ points: '', feedback: '', status: 'approved' });
  const [busy, setBusy] = useState(false);
  const [pointsError, setPointsError] = useState('');

  const load = () => api.get(`/submissions/${id}`)
    .then((r) => {
      setData(r.data.data);
      const s = r.data.data.submission;
      setForm({
        points: s.score != null ? String(s.score) : '',
        feedback: s.feedback || '',
        status: ['approved', 'needs_changes', 'rejected'].includes(s.status) ? s.status : 'approved',
      });
    })
    .catch((e) => setError(apiError(e)));

  useEffect(() => { load(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (error) return <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>;
  if (!data) return <PageLoader label="Loading submission…" />;

  const { submission: s, challenge, member, reviews } = data;
  const maxPoints = challenge?.maxPoints ?? 100;

  const submit = async (e) => {
    e.preventDefault();
    setPointsError('');
    const pts = Number(form.points);
    if (!Number.isFinite(pts) || pts < 0 || pts > maxPoints) {
      setPointsError(`Points must be between 0 and ${maxPoints}`);
      return;
    }
    if (form.status === 'approved' && pts === 0 && !form.feedback.trim()) {
      toast.error('Add feedback when awarding 0 points');
      return;
    }
    setBusy(true);
    try {
      const { data: r } = await api.post(`/submissions/${id}/review`, {
        points: pts,
        status: form.status,
        feedback: form.feedback.trim(),
      });
      toast.success(`Review saved — ${r.data.review.status === 'approved' ? `${pts} points awarded` : r.data.review.status.replace('_', ' ')}`);
      setData((d) => ({
        ...d,
        submission: r.data.submission,
        reviews: [
          {
            id: r.data.review.id,
            revision: r.data.review.revision,
            isLatest: true,
            pointsAwarded: r.data.review.pointsAwarded,
            feedback: r.data.review.feedback,
            status: r.data.review.status,
            reviewer: { name: 'You' },
            createdAt: r.data.review.createdAt,
          },
          ...(d.reviews || []).map((x) => ({ ...x, isLatest: false })),
        ],
      }));
    } catch (e2) {
      toast.error(apiError(e2));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeUp">
      <AdminNav />

      <button type="button" onClick={() => navigate(-1)} className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-primary-600">
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Submission content */}
        <div className="space-y-6 lg:col-span-3">
          <div className="card p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <Avatar user={member} size="md" />
                <div>
                  <p className="font-semibold text-slate-900">{member?.name}</p>
                  <p className="text-xs text-slate-400">@{member?.username} · {member?.email}</p>
                </div>
              </div>
              <StatusBadge status={s.status} />
            </div>

            <h1 className="mt-4 text-xl font-bold text-slate-900">{challenge?.title}</h1>
            <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
              <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> Submitted {formatDateTime(s.submittedAt)}</span>
              <span>{s.isOnTime ? 'On time' : 'Late submission'}</span>
              <span>Attempt #{s.attempt}</span>
              {challenge?.deadline && <span>Deadline {formatDateTime(challenge.deadline)}</span>}
            </p>

            <ul className="mt-5 space-y-4">
              {(s.answers || []).map((a) => (
                <li key={a.key} className="rounded-xl border border-slate-200 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{a.type}</p>
                  <div className="mt-1.5 break-all text-sm text-slate-700">
                    {a.value?.startsWith('http') ? (
                      <a href={a.value} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 font-medium text-primary-600 hover:underline">
                        <ExternalLink className="h-4 w-4" /> {a.value}
                      </a>
                    ) : a.type === 'text' ? (
                      <p className="whitespace-pre-wrap">{a.value}</p>
                    ) : (
                      <a href={a.value} target="_blank" rel="noreferrer" className="text-primary-600 hover:underline">{a.value}</a>
                    )}
                    {a.fileName && <span className="ml-2 text-xs text-slate-400">({a.fileName})</span>}
                  </div>
                  {a.type === 'image' && a.value && (
                    <img src={a.value} alt="Submission attachment" className="mt-3 max-h-64 rounded-lg border border-slate-100 object-contain" />
                  )}
                </li>
              ))}
            </ul>

            {s.previousSubmission && (
              <p className="mt-4 text-xs text-slate-400">
                Resubmission — previous attempt: {String(s.previousSubmission)}
              </p>
            )}
          </div>

          {/* Review history */}
          <div className="card p-6">
            <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
              <RotateCcw className="h-4 w-4 text-primary-500" /> Review history
            </h2>
            {!reviews?.length ? (
              <p className="mt-3 text-sm text-slate-400">No reviews yet for this submission.</p>
            ) : (
              <ol className="mt-4 space-y-3">
                {reviews.map((r) => (
                  <li key={r.id} className={`rounded-xl border p-4 ${r.isLatest ? 'border-primary-200 bg-primary-50/40' : 'border-slate-200'}`}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-slate-800">Revision {r.revision} {r.isLatest && <span className="badge bg-primary-100 text-primary-700 ring-1 ring-inset ring-primary-600/20 ml-1">latest</span>}</span>
                      <StatusBadge status={r.status} />
                    </div>
                    <p className="mt-1 text-xs text-slate-400">
                      {r.reviewer?.name ? `by ${r.reviewer.name} · ` : ''}{formatDateTime(r.createdAt)}
                      {r.pointsAwarded != null && r.status === 'approved' ? ` · ${r.pointsAwarded} points` : ''}
                      {r.isLatest === false && r.previousPoints != null ? '' : ''}
                    </p>
                    {r.feedback && <p className="mt-1.5 text-sm text-slate-600">“{r.feedback}”</p>}
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>

        {/* Scoring panel */}
        <div className="lg:col-span-2">
          <form onSubmit={submit} className="card sticky top-20 space-y-4 p-6">
            <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
              <Trophy className="h-4 w-4 text-amber-500" /> Score this submission
            </h2>

            <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
              Maximum possible: <span className="font-bold text-slate-900">{maxPoints} points</span>
              {s.score != null && <span> · current: <span className="font-bold text-emerald-600">{s.score}</span></span>}
            </div>

            <Field label="Points awarded" required error={pointsError} hint={`0 – ${maxPoints}`}>
              <Input
                type="number"
                min={0}
                max={maxPoints}
                step={1}
                value={form.points}
                onChange={(e) => setForm({ ...form, points: e.target.value })}
                error={pointsError}
              />
            </Field>

            <div className="flex gap-2">
              {[0, Math.round(maxPoints * 0.5), Math.round(maxPoints * 0.75), maxPoints].map((p) => (
                <button key={p} type="button" className="btn-secondary flex-1 !px-2 !py-1.5 !text-xs"
                  onClick={() => setForm({ ...form, points: String(p) })}>
                  {p}
                </button>
              ))}
            </div>

            <Field label="Review status" required>
              <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <option value="approved">Approved — award points</option>
                <option value="needs_changes">Needs changes — request resubmission</option>
                <option value="rejected">Rejected</option>
                <option value="under_review">Under review — keep waiting</option>
              </Select>
            </Field>

            <Field label="Feedback for the member" hint="Shown on their challenge page and in notifications">
              <Textarea rows={5} value={form.feedback} onChange={(e) => setForm({ ...form, feedback: e.target.value })}
                placeholder="What was good? What could improve?" maxLength={3000} />
            </Field>

            <button type="submit" className="btn-primary w-full" disabled={busy}>
              {busy ? <Spinner className="h-4 w-4" /> : <Send className="h-4 w-4" />}
              Save review
            </button>

            <p className="text-xs leading-relaxed text-slate-400">
              Scores only count towards the leaderboard when status is <strong>approved</strong>.
              Re-scoring replaces the previous review — history is kept, points are never double-counted.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
