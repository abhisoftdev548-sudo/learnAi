import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeft, CheckCircle2, Clock, Users, Lock } from 'lucide-react';
import api, { apiError } from '../services/api';
import { PageLoader, Spinner } from '../components/Spinner';
import StatusBadge from '../components/StatusBadge';
import { formatDateTime } from '../utils/format';

export default function PollDetail() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState([]);
  const [busy, setBusy] = useState(false);

  const load = () => api.get(`/polls/${id}`)
    .then((r) => {
      setData(r.data.data);
      setSelected(r.data.data.poll.myVote || []);
    })
    .catch((e) => setError(apiError(e)));

  useEffect(() => { load(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (error) return <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>;
  if (!data) return <PageLoader label="Loading poll…" />;

  const p = data.poll;
  const results = p.results;
  const canVote = p.liveStatus === 'active' && (!p.hasVoted || p.allowChangeVote);
  const voted = p.hasVoted;

  const toggle = (optId) => {
    if (!canVote) return;
    setSelected((s) => {
      if (p.allowMultiple) {
        return s.includes(optId) ? s.filter((x) => x !== optId) : [...s, optId];
      }
      return [optId];
    });
  };

  const submit = async () => {
    if (!selected.length) {
      toast.error('Pick an option first');
      return;
    }
    setBusy(true);
    try {
      const { data: r } = await api.post(`/polls/${id}/vote`, { optionIds: selected });
      toast.success(r.data.changed ? 'Vote updated' : 'Vote counted 🗳️');
      await load();
    } catch (e) {
      toast.error(apiError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6 animate-fadeUp">
      <Link to="/polls" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-primary-600">
        <ArrowLeft className="h-4 w-4" /> All polls
      </Link>

      <div className="card p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <StatusBadge status={p.liveStatus} />
          <div className="flex flex-wrap gap-2 text-xs text-slate-400">
            {p.anonymous && <span className="badge bg-slate-100 text-slate-500 ring-1 ring-inset ring-slate-500/20"><Lock className="h-3 w-3" /> Anonymous</span>}
            {p.allowMultiple && <span className="badge bg-slate-100 text-slate-500 ring-1 ring-inset ring-slate-500/20">Multiple choices allowed</span>}
          </div>
        </div>

        <h1 className="mt-4 text-2xl font-bold text-slate-900">{p.question}</h1>
        {p.image && <img src={p.image} alt="" className="mt-4 max-h-72 w-full rounded-xl bg-slate-50 object-contain" referrerPolicy="no-referrer" />}
        {p.description && <p className="mt-2 text-sm text-slate-500">{p.description}</p>}
        <p className="mt-3 flex flex-wrap items-center gap-4 text-xs text-slate-400">
          <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {formatDateTime(p.startsAt)} → {formatDateTime(p.endsAt)}</span>
          {results && <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {results.totalVotes} total votes</span>}
        </p>

        {/* Options */}
        <div className="mt-6 space-y-3">
          {p.options.map((o) => {
            const r = results?.options.find((x) => String(x.id) === String(o.id));
            const isSel = selected.includes(String(o.id)) || (p.myVote || []).includes(String(o.id));
            const showResults = !!results;
            return (
              <div key={o.id}>
                <button
                  type="button"
                  onClick={() => toggle(o.id)}
                  disabled={!canVote}
                  className={`relative w-full overflow-hidden rounded-xl border p-4 text-left transition ${
                    isSel && !showResults
                      ? 'border-primary-500 bg-primary-50 ring-4 ring-primary-500/10'
                      : 'border-slate-200 hover:border-primary-300'
                  } ${!canVote ? 'cursor-default' : ''}`}
                >
                  {showResults && (
                    <span
                      className={`absolute inset-y-0 left-0 ${isSel ? 'bg-primary-500/15' : 'bg-slate-100'}`}
                      style={{ width: `${r?.percent || 0}%`, transition: 'width .5s ease' }}
                      aria-hidden="true"
                    />
                  )}
                  <span className="relative flex items-center justify-between gap-3">
                    <span className="flex items-center gap-2.5 text-sm font-medium text-slate-800">
                      {canVote ? (
                        <span className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${isSel ? 'border-primary-600 bg-primary-600 text-white' : 'border-slate-300'}`}>
                          {isSel && <CheckCircle2 className="h-3.5 w-3.5" />}
                        </span>
                      ) : (
                        <span className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${(p.myVote || []).includes(String(o.id)) ? 'border-primary-600 bg-primary-600 text-white' : 'border-slate-300'}`}>
                          {(p.myVote || []).includes(String(o.id)) && <CheckCircle2 className="h-3.5 w-3.5" />}
                        </span>
                      )}
                      {o.text}
                    </span>
                    {showResults && (
                      <span className="text-sm font-bold text-slate-700">{r?.votes ?? 0} · {r?.percent ?? 0}%</span>
                    )}
                  </span>
                </button>
                {showResults && r?.voters?.length > 0 && (
                  <p className="mt-1 pl-4 text-xs text-slate-400">
                    {r.voters.map((v) => v.name).join(', ')}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {/* Actions */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5">
          <p className="text-sm text-slate-500">
            {!canVote && p.liveStatus !== 'active' && 'This poll is closed.'}
            {canVote && !voted && (p.allowMultiple ? 'Select one or more options, then vote.' : 'Select one option, then vote.')}
            {canVote && voted && p.allowChangeVote && 'You can change your vote until the poll closes.'}
            {!canVote && voted && 'You have voted — results below update live.'}
            {voted && !canVote && !p.allowChangeVote && ''}
          </p>
          {canVote && (
            <button type="button" className="btn-primary" onClick={submit} disabled={busy || !selected.length}>
              {busy && <Spinner className="h-4 w-4" />}
              {voted ? 'Update vote' : 'Cast my vote'}
            </button>
          )}
        </div>

        {!results && (
          <div className="mt-4 rounded-xl bg-slate-50 p-3 text-center text-xs text-slate-400">
            Results are hidden until the poll closes ({p.resultsVisibility === 'after_close' ? 'admin setting' : 'pending'}).
          </div>
        )}
      </div>
    </div>
  );
}
