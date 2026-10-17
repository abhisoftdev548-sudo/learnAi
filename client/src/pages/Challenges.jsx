import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Target, Search, Filter, ArrowRight, Trophy } from 'lucide-react';
import api, { apiError } from '../services/api';
import StatusBadge from '../components/StatusBadge';
import { PageLoader } from '../components/Spinner';
import EmptyState from '../components/EmptyState';
import Pagination from '../components/Pagination';
import ImageLightbox from '../components/ImageLightbox';
import { Field, Input, Select } from '../components/Form';
import {
  formatDate, remainingTime, truncate, CATEGORY_LABELS, DIFFICULTY_LABELS, statusLabel,
} from '../utils/format';

const STATUS_TONE = {
  submitted: 'bg-sky-50 text-sky-700 ring-sky-600/20',
  under_review: 'bg-indigo-50 text-indigo-700 ring-indigo-600/20',
  needs_changes: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  approved: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  rejected: 'bg-rose-50 text-rose-700 ring-rose-600/20',
  active: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  not_started: 'bg-slate-100 text-slate-600 ring-slate-500/20',
  overdue: 'bg-rose-50 text-rose-700 ring-rose-600/20',
  closed: 'bg-slate-100 text-slate-600 ring-slate-500/20',
};

export default function Challenges() {
  const [data, setData] = useState(null);
  const [q, setQ] = useState('');
  const [category, setCategory] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [deadline, setDeadline] = useState('');
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');
  const [previewImage, setPreviewImage] = useState('');

  const params = useMemo(() => {
    const p = new URLSearchParams({ page: String(page), limit: '12' });
    if (q) p.set('q', q);
    if (category) p.set('category', category);
    if (difficulty) p.set('difficulty', difficulty);
    if (deadline) p.set('deadline', deadline);
    return p.toString();
  }, [q, category, difficulty, deadline, page]);

  useEffect(() => {
    let alive = true;
    setData(null);
    api.get(`/challenges?${params}`)
      .then((r) => alive && setData(r.data.data))
      .catch((e) => alive && setError(apiError(e)));
    return () => { alive = false; };
  }, [params]);

  useEffect(() => setPage(1), [q, category, difficulty, deadline]);

  if (error) return <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>;

  return (
    <div className="space-y-5 animate-fadeUp">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Challenges</h1>
          <p className="mt-1 text-sm text-slate-500">Pick a challenge, submit your work before the deadline and earn points.</p>
        </div>
      </div>

      {/* Filters */}
      <div className="card grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search challenges…" className="!pl-9" />
        </div>
        <Select value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">All categories</option>
          {Object.entries(CATEGORY_LABELS).slice(0, 9).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </Select>
        <Select value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
          <option value="">Any difficulty</option>
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </Select>
        <Select value={deadline} onChange={(e) => setDeadline(e.target.value)}>
          <option value="">Any status</option>
          <option value="open">Open (deadline ahead)</option>
          <option value="closed">Deadline passed</option>
        </Select>
      </div>

      {!data ? (
        <PageLoader label="Loading challenges…" />
      ) : data.items.length === 0 ? (
        <EmptyState
          icon={Target}
          title="No challenges found"
          body={q || category || difficulty ? 'Try adjusting your filters.' : 'Published challenges will appear here as soon as an admin adds them.'}
        />
      ) : (
        <>
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {data.items.map((c) => {
              const rem = remainingTime(c.deadline);
              return (
                <Link
                  key={c.id}
                  to={`/challenges/${c.id}`}
                  className="card group flex flex-col p-5 transition hover:-translate-y-0.5 hover:shadow-pop"
                >
                  {c.coverImage && (
                    <img
                      src={c.coverImage}
                      alt=""
                      className="mb-4 aspect-video w-full cursor-zoom-in rounded-xl object-cover"
                      loading="lazy"
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        setPreviewImage(c.coverImage);
                      }}
                    />
                  )}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex flex-wrap gap-1.5">
                      <span className="badge bg-primary-50 text-primary-700 ring-1 ring-inset ring-primary-600/20">
                        {CATEGORY_LABELS[c.category] || c.category}
                      </span>
                      <span className="badge bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-500/20">
                        {DIFFICULTY_LABELS[c.difficulty] || c.difficulty}
                      </span>
                    </div>
                    <span className="flex shrink-0 items-center gap-1 text-sm font-bold text-amber-600">
                      <Trophy className="h-4 w-4" /> {c.maxPoints}
                    </span>
                  </div>

                  <h2 className="mt-3 line-clamp-2 text-base font-semibold leading-snug text-slate-900 group-hover:text-primary-700">
                    {c.title}
                  </h2>
                  <p className="mt-1.5 line-clamp-2 flex-1 text-sm text-slate-500">{truncate(c.description, 130)}</p>

                  <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                    <div>
                      <p className="text-xs text-slate-400">Due {formatDate(c.deadline)}</p>
                      <p className={`mt-0.5 text-xs font-semibold ${rem.urgent && !rem.past ? 'text-rose-500' : rem.past ? 'text-slate-400' : 'text-slate-600'}`}>
                        {rem.past ? 'Deadline passed' : rem.text}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`badge ring-1 ring-inset ${STATUS_TONE[c.memberStatus] || STATUS_TONE.closed}`}>
                        {statusLabel(c.memberStatus)}
                      </span>
                      <ArrowRight className="h-4 w-4 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-primary-500" />
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-slate-400">{c.submissionCount} submission{c.submissionCount === 1 ? '' : 's'}</p>
                </Link>
              );
            })}
          </div>
          <Pagination page={data.page} pages={data.pages} total={data.total} onChange={setPage} />
        </>
      )}
      <ImageLightbox src={previewImage} onClose={() => setPreviewImage('')} />
    </div>
  );
}
