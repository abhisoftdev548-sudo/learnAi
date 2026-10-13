import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { CalendarDays, Plus, Pencil, Trash2, Users, CheckCircle2, XCircle, Eye, Rocket } from 'lucide-react';
import api, { apiError } from '../../services/api';
import StatusBadge from '../../components/StatusBadge';
import { PageLoader, Spinner } from '../../components/Spinner';
import EmptyState from '../../components/EmptyState';
import Modal from '../../components/Modal';
import ConfirmDialog from '../../components/ConfirmDialog';
import Avatar from '../../components/Avatar';
import { formatDate, formatDateTime, CATEGORY_LABELS } from '../../utils/format';
import AdminNav from './AdminNav';

export default function AdminEvents() {
  const [data, setData] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [attendTarget, setAttendTarget] = useState(null);
  const [attendees, setAttendees] = useState(null);

  const load = () => api.get('/events?only=all&limit=50')
    .then((r) => setData(r.data.data))
    .catch((e) => toast.error(apiError(e)));

  useEffect(() => { load(); }, []);

  const changeStatus = async (e2, status) => {
    setBusyId(e2.id);
    try {
      await api.post(`/events/${e2.id}/status`, { status });
      toast.success(`Event ${status}`);
      await load();
    } catch (e) {
      toast.error(apiError(e));
    } finally {
      setBusyId(null);
    }
  };

  const remove = async () => {
    setBusyId(confirm.event.id);
    try {
      await api.delete(`/events/${confirm.event.id}`);
      toast.success('Event deleted');
      setConfirm(null);
      await load();
    } catch (e) {
      toast.error(apiError(e));
    } finally {
      setBusyId(null);
    }
  };

  const openAttendees = async (ev) => {
    setAttendTarget(ev);
    setAttendees(null);
    try {
      const { data: r } = await api.get(`/events/${ev.id}/registrations`);
      setAttendees(r.data.items);
    } catch (e) {
      toast.error(apiError(e));
      setAttendTarget(null);
    }
  };

  const setAttendance = async (memberId, status) => {
    try {
      await api.post(`/events/${attendTarget.id}/attendance`, { memberId, status });
      setAttendees((list) => list.map((r) => (String(r.member._id) === String(memberId) ? { ...r, status } : r)));
      toast.success('Attendance updated');
    } catch (e) {
      toast.error(apiError(e));
    }
  };

  return (
    <div className="space-y-6 animate-fadeUp">
      <AdminNav />

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Event management</h1>
          <p className="mt-1 text-sm text-slate-500">Create events, publish them and track attendance.</p>
        </div>
        <Link to="/admin/events/new" className="btn-primary"><Plus className="h-4 w-4" /> New event</Link>
      </div>

      {!data ? (
        <PageLoader label="Loading events…" />
      ) : data.items.length === 0 ? (
        <EmptyState icon={CalendarDays} title="No events yet" body="Schedule your first team event."
          action={<Link to="/admin/events/new" className="btn-primary"><Plus className="h-4 w-4" /> New event</Link>} />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
                <th className="px-5 py-3 font-semibold">Event</th>
                <th className="px-5 py-3 font-semibold">When</th>
                <th className="px-5 py-3 font-semibold">Platform</th>
                <th className="px-5 py-3 font-semibold text-right">Registered</th>
                <th className="px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {data.items.map((ev) => (
                <tr key={ev.id} className="transition hover:bg-slate-50/70">
                  <td className="px-5 py-3">
                    <p className="max-w-[240px] truncate font-semibold text-slate-800">{ev.title}</p>
                    <p className="text-xs text-slate-400">{CATEGORY_LABELS[ev.category] || ev.category} · host {ev.hostName}</p>
                  </td>
                  <td className="px-5 py-3 text-slate-600">
                    {formatDate(ev.date)}
                    <span className="block text-xs text-slate-400">{ev.startTime}-{ev.endTime}</span>
                  </td>
                  <td className="px-5 py-3 text-slate-600">{ev.platform || '—'}</td>
                  <td className="px-5 py-3 text-right text-slate-700">{ev.registeredCount ?? 0}</td>
                  <td className="px-5 py-3"><StatusBadge status={ev.status} /></td>
                  <td className="px-5 py-3">
                    <div className="flex justify-end gap-1.5">
                      <button type="button" className="btn-ghost !px-2.5 !py-1.5" title="Registrations" onClick={() => openAttendees(ev)}>
                        <Users className="h-4 w-4" />
                      </button>
                      <Link to={`/admin/events/${ev.id}/edit`} className="btn-ghost !px-2.5 !py-1.5" title="Edit">
                        <Pencil className="h-4 w-4" />
                      </Link>
                      {ev.status === 'draft' && (
                        <button type="button" className="btn-ghost !px-2.5 !py-1.5" title="Publish"
                          disabled={busyId === ev.id} onClick={() => changeStatus(ev, 'published')}>
                          {busyId === ev.id ? <Spinner className="h-4 w-4" /> : <Rocket className="h-4 w-4" />}
                        </button>
                      )}
                      {ev.status === 'published' && (
                        <>
                          <button type="button" className="btn-ghost !px-2.5 !py-1.5" title="Mark completed"
                            disabled={busyId === ev.id} onClick={() => changeStatus(ev, 'completed')}>
                            {busyId === ev.id ? <Spinner className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                          </button>
                          <button type="button" className="btn-ghost !px-2.5 !py-1.5 !text-rose-500 hover:!bg-rose-50" title="Cancel"
                            disabled={busyId === ev.id} onClick={() => changeStatus(ev, 'cancelled')}>
                            {busyId === ev.id ? <Spinner className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                          </button>
                        </>
                      )}
                      <button type="button" className="btn-ghost !px-2.5 !py-1.5 !text-rose-500 hover:!bg-rose-50" title="Delete"
                        onClick={() => setConfirm({ event: ev })}>
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Registrations / attendance modal */}
      <Modal open={!!attendTarget} onClose={() => setAttendTarget(null)} title={`Registrations — ${attendTarget?.title || ''}`} size="md">
        {!attendees ? (
          <div className="py-8 text-center"><Spinner className="mx-auto h-6 w-6 text-primary-500" /></div>
        ) : attendees.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-400">No registrations yet.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {attendees.map((r) => (
              <li key={r._id} className="flex flex-wrap items-center gap-3 py-3">
                <Avatar user={r.member} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-800">{r.member?.name}</p>
                  <p className="text-xs text-slate-400">{r.member?.email} · registered {formatDateTime(r.registeredAt)}</p>
                </div>
                <select
                  value={r.status}
                  onChange={(e) => setAttendance(r.member._id, e.target.value)}
                  className="input !w-36 !py-1.5 !text-xs"
                >
                  <option value="registered">Registered</option>
                  <option value="attended">Attended</option>
                  <option value="no_show">No show</option>
                </select>
              </li>
            ))}
          </ul>
        )}
      </Modal>

      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={remove}
        title={`Delete "${confirm?.event?.title}"?`}
        body="All registrations for this event will be removed too."
        confirmLabel="Delete"
        danger
      />
    </div>
  );
}
