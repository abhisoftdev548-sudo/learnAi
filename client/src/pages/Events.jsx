import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, Search, MapPin, Users, ArrowRight } from 'lucide-react';
import api, { apiError } from '../services/api';
import StatusBadge from '../components/StatusBadge';
import { PageLoader } from '../components/Spinner';
import EmptyState from '../components/EmptyState';
import Pagination from '../components/Pagination';
import { Input, Select } from '../components/Form';
import { formatDate, CATEGORY_LABELS } from '../utils/format';
import ImageLightbox from '../components/ImageLightbox';

export default function Events() {
  const [data, setData] = useState(null);
  const [q, setQ] = useState('');
  const [tab, setTab] = useState('upcoming'); // upcoming | past
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');
  const [previewImage, setPreviewImage] = useState('');

  const params = useMemo(() => {
    const p = new URLSearchParams({ page: String(page), limit: '12' });
    if (tab === 'upcoming') p.set('upcoming', '1');
    if (tab === 'past') p.set('past', '1');
    if (q) p.set('q', q);
    return p.toString();
  }, [tab, q, page]);

  useEffect(() => {
    let alive = true;
    setData(null);
    api.get(`/events?${params}`)
      .then((r) => alive && setData(r.data.data))
      .catch((e) => alive && setError(apiError(e)));
    return () => { alive = false; };
  }, [params]);

  useEffect(() => setPage(1), [tab, q]);

  if (error) return <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>;

  return (
    <div className="space-y-5 animate-fadeUp">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Events</h1>
        <p className="mt-1 text-sm text-slate-500">Workshops, practice sessions and team meetings — register to get the details.</p>
      </div>

      <div className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
        <div className="flex rounded-xl bg-slate-100 p-1">
          {['upcoming', 'past'].map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`rounded-lg px-4 py-1.5 text-sm font-semibold capitalize transition ${tab === t ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search events…" className="!pl-9" />
        </div>
      </div>

      {!data ? (
        <PageLoader label="Loading events…" />
      ) : data.items.length === 0 ? (
        <EmptyState icon={CalendarDays} title="No events found" body={tab === 'upcoming' ? 'Upcoming events will appear here.' : 'No past events yet.'} />
      ) : (
        <>
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {data.items.map((e) => (
              <Link key={e.id} to={`/events/${e.id}`} className="card group flex flex-col p-5 transition hover:-translate-y-0.5 hover:shadow-pop">
                {e.coverImage && (
                  <img
                    src={e.coverImage}
                    alt=""
                    className="mb-4 aspect-video w-full cursor-zoom-in rounded-xl object-cover"
                    loading="lazy"
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      setPreviewImage(e.coverImage);
                    }}
                  />
                )}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-wrap gap-1.5">
                    <span className="badge bg-violet-50 text-violet-700 ring-1 ring-inset ring-violet-600/20">
                      {CATEGORY_LABELS[e.category] || e.category}
                    </span>
                    {e.isPrivate && (
                      <span className="badge bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-500/20">Private</span>
                    )}
                  </div>
                  <StatusBadge status={e.status} />
                </div>

                <h2 className="mt-3 line-clamp-2 text-base font-semibold leading-snug text-slate-900 group-hover:text-primary-700">
                  {e.title}
                </h2>

                <div className="mt-3 flex-1 space-y-1.5 text-sm text-slate-500">
                  <p className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 shrink-0 text-slate-400" />
                    {formatDate(e.date)} · {e.startTime}-{e.endTime}
                  </p>
                  {e.platform && (
                    <p className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 shrink-0 text-slate-400" /> {e.platform}
                    </p>
                  )}
                  <p className="flex items-center gap-2">
                    <Users className="h-4 w-4 shrink-0 text-slate-400" /> {e.registeredCount ?? 0} registered
                  </p>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                  <div className="flex items-center gap-2">
                    {e.registered && <span className="badge bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20">Registered</span>}
                    {e.attended && <span className="badge bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-600/20">Attended</span>}
                  </div>
                  <ArrowRight className="h-4 w-4 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-primary-500" />
                </div>
              </Link>
            ))}
          </div>
          <Pagination page={data.page} pages={data.pages} total={data.total} onChange={setPage} />
        </>
      )}
      <ImageLightbox src={previewImage} onClose={() => setPreviewImage('')} />
    </div>
  );
}
