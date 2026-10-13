import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Trophy, Medal, Crown, Calendar } from 'lucide-react';
import api, { apiError } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Avatar from '../components/Avatar';
import { PageLoader } from '../components/Spinner';
import EmptyState from '../components/EmptyState';
import { formatDate } from '../utils/format';

const PERIODS = [
  { key: 'all', label: 'All time' },
  { key: 'month', label: 'This month' },
  { key: 'week', label: 'This week' },
];

function rankStyle(rank) {
  if (rank === 1) return 'text-amber-500';
  if (rank === 2) return 'text-slate-400';
  if (rank === 3) return 'text-amber-700';
  return 'text-slate-300';
}

export default function Leaderboard() {
  const { user } = useAuth();
  const [period, setPeriod] = useState('all');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    setData(null);
    api.get(`/leaderboard?period=${period}`)
      .then((r) => alive && setData(r.data.data))
      .catch((e) => alive && setError(apiError(e)));
    return () => { alive = false; };
  }, [period]);

  if (error) return <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>;
  if (!data) return <PageLoader label="Loading leaderboard…" />;

  const top3 = data.rows.slice(0, 3);
  const rest = data.rows.slice(3);
  const podiumOrder = [top3[1], top3[0], top3[2]].filter(Boolean);

  return (
    <div className="space-y-6 animate-fadeUp">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Leaderboard</h1>
          <p className="mt-1 text-sm text-slate-500">
            Ranked by approved challenge points · ties broken by completed challenges, then most recent score.
          </p>
        </div>
        <div className="flex rounded-xl bg-slate-100 p-1">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => setPeriod(p.key)}
              className={`rounded-lg px-4 py-1.5 text-sm font-semibold transition ${period === p.key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* My position */}
      {data.me && (
        <div className="card flex flex-wrap items-center justify-between gap-4 border-primary-200 bg-gradient-to-r from-primary-50 to-indigo-50 p-5">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary-600 text-lg font-black text-white">
              {data.me.rank}
            </span>
            <div>
              <p className="text-sm text-slate-500">Your position{user ? `, ${user.name?.split(' ')[0]}` : ''}</p>
              <p className="text-lg font-bold text-slate-900">{data.me.points} points · {data.me.completedChallenges} completed</p>
            </div>
          </div>
          <Link to="/challenges" className="btn-primary">Earn more points</Link>
        </div>
      )}

      {/* Podium */}
      {top3.length > 0 && (
        <div className="grid grid-cols-1 items-end gap-4 sm:grid-cols-3">
          {podiumOrder.map((m) => (
            <Link
              key={m.userId}
              to={`/members/${m.username}`}
              className={`card flex flex-col items-center p-5 transition hover:shadow-pop ${m.rank === 1 ? 'sm:-mt-3 border-amber-200' : ''}`}
            >
              {m.rank === 1 ? <Crown className="h-5 w-5 text-amber-500" /> : <Medal className={`h-5 w-5 ${rankStyle(m.rank)}`} />}
              <div className="mt-2"><Avatar user={m} size={m.rank === 1 ? 'lg' : 'md'} /></div>
              <p className="mt-2 text-center text-sm font-bold text-slate-900">{m.name}</p>
              <p className="text-xs text-slate-400">@{m.username}</p>
              <p className="mt-2 text-xl font-black text-primary-600">{m.points}</p>
              <p className="text-xs text-slate-400">points · {m.completedChallenges} done</p>
            </Link>
          ))}
        </div>
      )}

      {/* Table */}
      {data.rows.length === 0 ? (
        <EmptyState icon={Trophy} title="No scores yet" body="Approved challenge submissions will appear here." />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
                <th className="px-5 py-3 font-semibold">Rank</th>
                <th className="px-5 py-3 font-semibold">Member</th>
                <th className="px-5 py-3 font-semibold text-right">Points</th>
                <th className="px-5 py-3 font-semibold text-right">Challenges</th>
                <th className="px-5 py-3 font-semibold text-right">Latest score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {data.rows.map((m) => (
                <tr key={m.userId} className={`transition hover:bg-slate-50/70 ${String(m.userId) === String(user?.id) ? 'bg-primary-50/50' : ''}`}>
                  <td className="px-5 py-3">
                    <span className={`inline-flex h-8 w-8 items-center justify-center rounded-lg bg-slate-50 text-sm font-black ${rankStyle(m.rank)}`}>
                      {m.rank}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <Link to={`/members/${m.username}`} className="flex items-center gap-3 group">
                      <Avatar user={m} size="sm" />
                      <div>
                        <p className="font-semibold text-slate-800 group-hover:text-primary-600">{m.name}</p>
                        <p className="text-xs text-slate-400">@{m.username}</p>
                      </div>
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-right font-bold text-slate-900">{m.points}</td>
                  <td className="px-5 py-3 text-right text-slate-600">{m.completedChallenges}</td>
                  <td className="px-5 py-3 text-right text-xs text-slate-400">
                    {m.lastScoredAt ? formatDate(m.lastScoredAt) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="flex items-center justify-center gap-1.5 text-xs text-slate-400">
        <Calendar className="h-3.5 w-3.5" /> Only reviewed &amp; approved submissions count towards scores.
      </p>
    </div>
  );
}
