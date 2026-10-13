import { useState } from 'react';
import { CheckCircle2, ChevronDown, Clock, Eye, Lightbulb, ListChecks, RotateCcw, Target, Zap } from 'lucide-react';
import { CategoryBadge, DifficultyBadge } from '../ui/Badge.jsx';
import { GROUP_LABELS } from '../../lib/constants.js';

/** Collapsible hints — the user reveals them one by one. */
function Hints({ hints = [] }) {
  const [revealed, setRevealed] = useState(0);

  if (!hints.length) return null;

  return (
    <div>
      <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-ink-800">
        <Lightbulb className="h-4 w-4 text-amber-500" /> Hints
        <span className="text-xs font-normal text-ink-400">
          ({revealed}/{hints.length} revealed)
        </span>
      </h3>

      <div className="space-y-2">
        {hints.slice(0, revealed).map((hint, index) => (
          <p key={index} className="rounded-lg border border-amber-100 bg-amber-50/70 px-3 py-2 text-sm text-amber-900">
            {hint}
          </p>
        ))}

        {revealed < hints.length ? (
          <button
            type="button"
            onClick={() => setRevealed((count) => count + 1)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-600 transition hover:text-brand-700"
          >
            <ChevronDown className="h-3.5 w-3.5" />
            {revealed === 0 ? 'Reveal first hint' : 'Reveal next hint'}
          </button>
        ) : null}
      </div>
    </div>
  );
}

/** Challenge brief shown beside the editor. */
export function ChallengePanel({ challenge, attempts, bestScore, solved, className = '' }) {
  if (!challenge) return null;

  const requirementGroups = (challenge.requiredTests ?? []).reduce((acc, test) => {
    acc[test.group] = acc[test.group] ?? [];
    acc[test.group].push(test);
    return acc;
  }, {});

  return (
    <div className={`scrollbar-thin flex min-h-0 flex-col gap-5 overflow-y-auto ${className}`}>
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <CategoryBadge category={challenge.category} />
          <DifficultyBadge difficulty={challenge.difficulty} />
          {solved ? (
            <span className="chip border border-emerald-100 bg-emerald-50 text-emerald-700">
              <CheckCircle2 className="h-3.5 w-3.5" /> Solved
            </span>
          ) : null}
        </div>
        <h1 className="mt-3 text-xl font-semibold tracking-tight text-ink-900">{challenge.title}</h1>
        <p className="mt-1.5 text-sm text-ink-500">{challenge.description}</p>
      </div>

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <dt className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-500">
            <Zap className="h-3.5 w-3.5 text-brand-500" /> XP
          </dt>
          <dd className="mt-1 text-lg font-semibold text-ink-900">{challenge.xp}</dd>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <dt className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-500">
            <Clock className="h-3.5 w-3.5" /> Time limit
          </dt>
          <dd className="mt-1 text-lg font-semibold text-ink-900">{challenge.timeLimit}m</dd>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <dt className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-500">
            <RotateCcw className="h-3.5 w-3.5" /> Attempts
          </dt>
          <dd className="mt-1 text-lg font-semibold text-ink-900">
            {attempts?.used ?? 0}
            <span className="text-sm font-normal text-ink-400"> / {attempts?.max ?? challenge.maxAttempts ?? 3}</span>
          </dd>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <dt className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-500">
            <Target className="h-3.5 w-3.5" /> Best score
          </dt>
          <dd className="mt-1 text-lg font-semibold text-ink-900">{bestScore ?? 0}</dd>
        </div>
      </dl>

      <section>
        <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-ink-800">
          <ListChecks className="h-4 w-4 text-brand-500" /> Requirements
        </h3>
        <ul className="space-y-1.5">
          {(challenge.instructions ?? []).map((instruction, index) => (
            <li key={index} className="flex items-start gap-2 text-sm text-ink-600">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-300" />
              {instruction}
            </li>
          ))}
        </ul>
      </section>

      {Object.keys(requirementGroups).length ? (
        <section>
          <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-ink-800">
            <Eye className="h-4 w-4 text-brand-500" /> What is checked
          </h3>
          <div className="space-y-3">
            {Object.entries(requirementGroups).map(([group, tests]) => (
              <div key={group}>
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">{GROUP_LABELS[group] ?? group}</p>
                <ul className="mt-1 space-y-1">
                  {tests.map((test) => (
                    <li key={test.id} className="flex items-center justify-between gap-2 text-sm text-ink-600">
                      <span>{test.name}</span>
                      <span className="text-[10px] uppercase tracking-wide text-ink-400">{test.measurement ? 'sandbox' : 'server'}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <Hints hints={challenge.hints ?? []} />

      <p className="mt-auto border-t border-slate-100 pt-3 text-xs text-ink-400">
        Passing score {challenge.passingScore ?? 70}/100 · {challenge.testCount ?? 0} automated checks · code runs in a sandboxed iframe, never on the server.
      </p>
    </div>
  );
}

export default ChallengePanel;
