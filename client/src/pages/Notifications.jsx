import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Bell, CheckCheck, Calendar, Target, Trophy, MessageSquare, Heart,
  ShieldCheck, BarChart3, Megaphone, Inbox,
} from 'lucide-react';
import api, { apiError } from '../services/api';
import { PageLoader } from '../components/Spinner';
import EmptyState from '../components/EmptyState';
import Pagination from '../components/Pagination';
import { timeAgo } from '../utils/format';

const ICONS = {
  account_approved: ShieldCheck,
  account_rejected: ShieldCheck,
  account_suspended: ShieldCheck,
  challenge_published: Target,
  challenge_deadline: Target,
  submission_reviewed: Trophy,
  submission_needs_changes: Target,
  submission_rejected: Target,
  points_awarded: Trophy,
  event_published: Calendar,
  event_reminder: Calendar,
  event_cancelled: Calendar,
  poll_opened: BarChart3,
  poll_closed: BarChart3,
  post_liked: Heart,
  post_commented: MessageSquare,
  general: Megaphone,
};

export default function Notifications() {
  const [data, setData] = useState(null);
  const [page, setPage] = useState(1);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [error, setError] = useState('');

  const load = () => {
    const params = new URLSearchParams({ page: String(page), limit: '20' });
    if (unreadOnly) params.set('unread', '1');
    api.get(`/notifications?${params}`)
      .then((r) => setData(r.data.data))
      .catch((e) => setError(apiError(e)));
  };

  useEffect(() => { load(); }, [page, unreadOnly]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => setPage(1), [unreadOnly]);

  const markRead = async (n) => {
    if (n.read) return;
    try {
      await api.post(`/notifications/${n._id}/read`);
      setData((d) => ({
        ...d,
        unread: Math.max(0, d.unread - 1),
        items: d.items.map((x) => (x._id === n._id ? { ...x, read: true } : x)),
      }));
    } catch (e) {
      toast.error(apiError(e));
    }
  };

  const markAll = async () => {
    try {
      await api.post('/notifications/read-all');
      setData((d) => ({ ...d, unread: 0, items: d.items.map((x) => ({ ...x, read: true })) }));
      toast.success('All caught up');
    } catch (e) {
      toast.error(apiError(e));
    }
  };

  if (error) return <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>;
  if (!data) return <PageLoader label="Loading notifications…" />;

  return (
    <div className="mx-auto max-w-3xl space-y-5 animate-fadeUp">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Notifications</h1>
          <p className="mt-1 text-sm text-slate-500">
            {data.unread > 0 ? `${data.unread} unread notification${data.unread === 1 ? '' : 's'}` : 'You are all caught up.'}
          </p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => setUnreadOnly(!unreadOnly)} className={unreadOnly ? 'btn-primary !py-2' : 'btn-secondary !py-2'}>
            {unreadOnly ? 'Showing unread' : 'Unread only'}
          </button>
          <button type="button" className="btn-secondary !py-2" onClick={markAll} disabled={data.unread === 0}>
            <CheckCheck className="h-4 w-4" /> Mark all read
          </button>
        </div>
      </div>

      {data.items.length === 0 ? (
        <EmptyState icon={Bell} title="No notifications" body={unreadOnly ? 'No unread notifications — nice work!' : 'Updates about approvals, challenges, reviews and events will land here.'} />
      ) : (
        <>
          <ul className="card divide-y divide-slate-100 overflow-hidden">
            {data.items.map((n) => {
              const Icon = ICONS[n.type] || Inbox;
              return (
                <li key={n._id}>
                  <button
                    type="button"
                    onClick={() => markRead(n)}
                    className={`flex w-full items-start gap-3 px-5 py-4 text-left transition hover:bg-slate-50 ${!n.read ? 'bg-primary-50/40' : ''}`}
                  >
                    <span className={`mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${!n.read ? 'bg-primary-100 text-primary-700' : 'bg-slate-100 text-slate-400'}`}>
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className={`truncate text-sm ${!n.read ? 'font-semibold text-slate-900' : 'font-medium text-slate-600'}`}>
                          {n.title}
                        </span>
                        {!n.read && <span className="h-2 w-2 shrink-0 rounded-full bg-primary-500" />}
                      </span>
                      {n.body && <span className="mt-0.5 block text-sm text-slate-500">{n.body}</span>}
                      <span className="mt-1 block text-xs text-slate-400">{timeAgo(n.createdAt)}</span>
                    </span>
                    {n.link && (
                      <span
                        onClick={(e) => { e.stopPropagation(); markRead(n); }}
                        className="shrink-0"
                      >
                        <Link to={n.link} className="text-xs font-semibold text-primary-600 hover:underline" onClick={(e) => e.stopPropagation()}>
                          Open
                        </Link>
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
          <Pagination page={data.page} pages={data.pages} total={data.total} onChange={setPage} />
        </>
      )}
    </div>
  );
}
