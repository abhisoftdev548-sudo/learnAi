import { CheckCircle2, XCircle, Info } from 'lucide-react';
import { GROUP_LABELS, GROUP_MAX_POINTS } from '../../lib/constants.js';

const GROUP_ORDER = ['html', 'css', 'functionality', 'responsiveness', 'codeQuality'];

/**
 * Rubric view of a submission: per-group score bars plus the individual test
 * results returned by the API (server-verified vs sandbox-measured).
 */
export function TestBreakdown({ testResults = [], categoryScores = {}, challenge = null }) {
  const grouped = GROUP_ORDER.map((group) => ({
    group,
    label: GROUP_LABELS[group],
    max: categoryScores?.[group]?.max ?? GROUP_MAX_POINTS[group] ?? 0,
    earned: categoryScores?.[group]?.earned ?? 0,
    tests: testResults.filter((test) => test.group === group),
  })).filter((entry) => entry.max > 0);

  return (
    <div className="space-y-5">
      {grouped.map((entry) => {
        const percent = entry.max ? Math.round((entry.earned / entry.max) * 100) : 0;
        return (
          <section key={entry.group}>
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-ink-800">{entry.label}</h3>
              <span className="text-xs font-semibold text-ink-600">
                {Math.round(entry.earned)} / {entry.max}
              </span>
            </div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full ${percent >= 70 ? 'bg-emerald-500' : percent >= 40 ? 'bg-amber-500' : 'bg-rose-500'}`}
                style={{ width: `${percent}%` }}
              />
            </div>

            <ul className="mt-3 space-y-1.5">
              {entry.tests.map((test) => (
                <li key={test.testId} className="flex items-start gap-2.5 text-sm">
                  {test.passed ? (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                  ) : (
                    <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className={`${test.passed ? 'text-ink-700' : 'font-medium text-ink-800'}`}>{test.name}</p>
                    {!test.passed && (test.message || test.expected) ? (
                      <p className="mt-0.5 text-xs text-ink-500">{test.message || `Expected ${String(test.expected)}`}</p>
                    ) : null}
                  </div>
                  <span className="mt-0.5 flex shrink-0 items-center gap-1 text-[10px] uppercase tracking-wide text-ink-400">
                    {test.verifiedBy === 'sandbox' ? (
                      <>
                        <Info className="h-3 w-3" /> sandbox
                      </>
                    ) : (
                      'server'
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        );
      })}

      {!grouped.length ? <p className="text-sm text-ink-500">No test results were recorded for this submission.</p> : null}

      {challenge ? (
        <p className="border-t border-slate-100 pt-3 text-xs text-ink-500">
          Passing score for <span className="font-medium text-ink-700">{challenge.title}</span> is {challenge.passingScore ?? 70} / 100.
        </p>
      ) : null}
    </div>
  );
}

export default TestBreakdown;
