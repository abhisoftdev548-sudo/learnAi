import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  ArrowLeft, CalendarDays, Clock, MapPin, Users, Video, ExternalLink,
  CheckCircle2, UserRound,
} from 'lucide-react';
import api, { apiError } from '../services/api';
import { PageLoader, Spinner } from '../components/Spinner';
import StatusBadge from '../components/StatusBadge';
import { formatDateTime, CATEGORY_LABELS } from '../utils/format';

export default function EventDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = () => api.get(`/events/${id}`)
    .then((r) => setData(r.data.data))
    .catch((e) => setError(apiError(e)));
  useEffect(() => { load(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (error) return <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>;
  if (!data) return <PageLoader label="Loading event…" />;

  const e = data.event;
  const past = e.past || e.status === 'completed';

  const toggleRegister = async () => {
    setBusy(true);
    try {
      if (data.myStatus) {
        await api.delete(`/events/${id}/register`);
        toast.success('Registration cancelled');
      } else {
        await api.post(`/events/${id}/register`);
        toast.success('You are registered 🎉');
      }
      await load();
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 animate-fadeUp">
      <Link to="/events" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-primary-600">
        <ArrowLeft className="h-4 w-4" /> All events
      </Link>

      <div className="card overflow-hidden">
        <div className="bg-gradient-to-r from-primary-600 to-indigo-600 px-6 py-8 text-white sm:px-8">
          {e.coverImage && (
            <img src={e.coverImage} alt="" className="mb-5 aspect-video w-full rounded-xl object-contain bg-white/10" referrerPolicy="no-referrer" />
          )}
          <div className="flex flex-wrap items-center gap-2">
            <span className="badge bg-white/15 text-white ring-1 ring-inset ring-white/25">
              {CATEGORY_LABELS[e.category] || e.category}
            </span>
            <span className="badge bg-white/15 text-white ring-1 ring-inset ring-white/25">{e.status}</span>
            {e.isPrivate && <span className="badge bg-white/15 text-white ring-1 ring-inset ring-white/25">Private event</span>}
          </div>
          <h1 className="mt-3 text-2xl font-bold sm:text-3xl">{e.title}</h1>
          <p className="mt-2 flex items-center gap-2 text-sm text-white/80">
            <UserRound className="h-4 w-4" /> Hosted by {e.hostName}
          </p>
        </div>

        <div className="space-y-6 p-6 sm:p-8">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-100 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Date</p>
              <p className="mt-1 flex items-center gap-2 text-sm font-semibold text-slate-800">
                <CalendarDays className="h-4 w-4 text-primary-500" /> {formatDateTime(e.date)}
              </p>
            </div>
            <div className="rounded-xl border border-slate-100 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Time</p>
              <p className="mt-1 flex items-center gap-2 text-sm font-semibold text-slate-800">
                <Clock className="h-4 w-4 text-primary-500" /> {e.startTime} - {e.endTime}
              </p>
            </div>
            <div className="rounded-xl border border-slate-100 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Registered</p>
              <p className="mt-1 flex items-center gap-2 text-sm font-semibold text-slate-800">
                <Users className="h-4 w-4 text-primary-500" /> {data.registeredCount} member{data.registeredCount === 1 ? '' : 's'}
              </p>
            </div>
          </div>

          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Description</h2>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-600">{e.description}</p>
          </div>

          {/* Meeting details */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <Video className="h-4 w-4 text-slate-400" />
                  {e.platform || 'Online event'}
                </p>
                {e.status === 'cancelled' && (
                  <p className="mt-1 text-sm font-medium text-rose-600">This event was cancelled.</p>
                )}
                {!e.meetingUrl && e.status === 'published' && (
                  <p className="mt-1 text-xs text-slate-400">
                    {e.isPrivate ? 'Register to see the meeting link.' : 'Meeting link coming soon.'}
                  </p>
                )}
              </div>
              {e.meetingUrl && (e.status === 'published' || e.status === 'completed') && (
                <a href={e.meetingUrl} target="_blank" rel="noreferrer" className="btn-primary">
                  <ExternalLink className="h-4 w-4" /> Open meeting link
                </a>
              )}
            </div>
          </div>

          {/* Registration */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 pt-5">
            <div className="text-sm text-slate-500">
              {e.registrationDeadline && !past && (
                <>Registration closes {formatDateTime(e.registrationDeadline)}</>
              )}
              {past && <>This event has already taken place.</>}
              {data.myStatus === 'attended' && (
                <span className="ml-2 badge bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                  <CheckCircle2 className="h-3 w-3" /> You attended
                </span>
              )}
            </div>
            {!past && e.status === 'published' && (
              <button type="button" onClick={toggleRegister} disabled={busy} className={data.myStatus ? 'btn-secondary' : 'btn-primary'}>
                {busy && <Spinner className="h-4 w-4" />}
                {data.myStatus ? 'Cancel registration' : 'Register for this event'}
              </button>
            )}
            {e.status === 'draft' && (
              <button type="button" className="btn-secondary" onClick={() => navigate('/admin/events/new')}>
                Manage as admin
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
