import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, Search, Trophy, ArrowRight } from 'lucide-react';
import api, { apiError } from '../services/api';
import Avatar from '../components/Avatar';
import { PageLoader } from '../components/Spinner';
import EmptyState from '../components/EmptyState';
import Pagination from '../components/Pagination';
import { Input } from '../components/Form';
import { truncate } from '../utils/format';

export default function Members() {
  const [data, setData] = useState(null);
  const [skills, setSkills] = useState([]);
  const [q, setQ] = useState('');
  const [skill, setSkill] = useState('');
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');

  const params = useMemo(() => {
    const p = new URLSearchParams({ page: String(page), limit: '24' });
    if (q) p.set('q', q);
    if (skill) p.set('skill', skill);
    return p.toString();
  }, [q, skill, page]);

  useEffect(() => {
    let alive = true;
    setData(null);
    api.get(`/users?${params}`)
      .then((r) => alive && setData(r.data.data))
      .catch((e) => alive && setError(apiError(e)));
    return () => { alive = false; };
  }, [params]);

  useEffect(() => {
    api.get('/users/skills').then((r) => setSkills(r.data.data.skills)).catch(() => {});
  }, []);

  useEffect(() => setPage(1), [q, skill]);

  if (error) return <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>;

  return (
    <div className="space-y-5 animate-fadeUp">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Members</h1>
        <p className="mt-1 text-sm text-slate-500">Discover your teammates, their skills and recent achievements.</p>
      </div>

      <div className="card flex flex-col gap-3 p-4 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, username or bio…" className="!pl-9" />
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setSkill('')} className={!skill ? 'btn-primary !py-2' : 'btn-secondary !py-2'}>
            All skills
          </button>
          {skills.slice(0, 6).map((s) => (
            <button key={s} type="button" onClick={() => setSkill(s === skill ? '' : s)} className={skill === s ? 'btn-primary !py-2' : 'btn-secondary !py-2'}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {!data ? (
        <PageLoader label="Loading members…" />
      ) : data.users.length === 0 ? (
        <EmptyState icon={Users} title="No members found" body="Try a different search or filter." />
      ) : (
        <>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {data.users.map((m) => (
              <Link key={m._id} to={`/members/${m.username}`} className="card group flex flex-col items-center p-5 text-center transition hover:-translate-y-0.5 hover:shadow-pop">
                <Avatar user={m} size="lg" />
                <p className="mt-3 font-semibold text-slate-900 group-hover:text-primary-600">{m.name}</p>
                <p className="text-xs text-slate-400">@{m.username}</p>
                {m.bio && <p className="mt-2 line-clamp-2 min-h-[2.5rem] text-xs text-slate-500">{truncate(m.bio, 90)}</p>}
                <div className="mt-3 flex w-full items-center justify-center gap-3 border-t border-slate-100 pt-3 text-xs">
                  <span className="inline-flex items-center gap-1 font-bold text-amber-600">
                    <Trophy className="h-3.5 w-3.5" /> {m.points}
                  </span>
                  <span className="text-slate-400">{m.completedChallenges} done</span>
                </div>
                {m.skills?.length > 0 && (
                  <div className="mt-2 flex flex-wrap justify-center gap-1">
                    {m.skills.slice(0, 3).map((s) => (
                      <span key={s} className="badge bg-slate-100 text-slate-500 ring-1 ring-inset ring-slate-500/20">{s}</span>
                    ))}
                    {m.skills.length > 3 && <span className="badge bg-slate-100 text-slate-400">+{m.skills.length - 3}</span>}
                  </div>
                )}
                <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary-600 opacity-0 transition group-hover:opacity-100">
                  View profile <ArrowRight className="h-3 w-3" />
                </span>
              </Link>
            ))}
          </div>
          <Pagination page={data.page} pages={data.pages} total={data.total} onChange={setPage} />
        </>
      )}
    </div>
  );
}
