import { Award, ArrowRight, CheckCircle2, Clock, RotateCcw, Sparkles, Target, Trophy, XCircle, Zap } from 'lucide-react';
import { Modal } from '../ui/Modal.jsx';
import Button from '../ui/Button.jsx';
import TestBreakdown from './TestBreakdown.jsx';
import { AchievementIcon } from '../ui/AchievementIcon.jsx';
import { formatDuration, formatNumber } from '../../lib/format.js';
import { GROUP_LABELS } from '../../lib/constants.js';

/**
 * Post-submission report: score, rubric breakdown, XP, achievements and the
 * next actions (try again / next challenge / open the submission).
 */
export function SubmissionResultModal({ open, onClose, payload, onTryAgain }) {
  if (!payload) return null;

  const { result, breakdown, user, attempts, achievements, nextChallenge, submission } = payload;
  const passed = result?.passed ?? result?.status === 'passed';
  // `achievements` is the list of achievements unlocked by this submission.
  const newAchievements = Array.isArray(achievements) ? achievements : achievements?.newlyEarned ?? [];
  const exhausted = attempts?.exhausted;

  return (
    <Modal open={open} onClose={onClose} title="Submission result" size="lg">
      <div className="space-y-6">
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-slate-200 bg-gradient-to-b from-slate-50 to-white p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-5">
            <div
              className={`flex h-20 w-20 flex-col items-center justify-center rounded-2xl text-white shadow-sm ${
                passed ? 'bg-gradient-to-br from-emerald-500 to-teal-500' : 'bg-gradient-to-br from-rose-500 to-orange-500'
              }`}
            >
              <span className="text-2xl font-bold leading-none">{result?.score ?? 0}</span>
              <span className="text-[11px] opacity-90">/ 100</span>
            </div>
            <div>
              <p className={`inline-flex items-center gap-1.5 text-sm font-semibold ${passed ? 'text-emerald-600' : 'text-rose-600'}`}>
                {passed ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                {passed ? (result?.isPerfect ? 'Perfect submission' : 'Passed') : 'Not passed yet'}
              </p>
              <p className="mt-1 text-sm text-ink-600">
                {result?.testsPassed ?? 0} / {result?.totalTests ?? 0} tests passed
              </p>
              <p className="mt-0.5 text-xs text-ink-500">
                Attempt: {result?.attemptNumber ?? 1} / {attempts?.max ?? 3} · time {formatDuration(result?.timeTaken ?? 0)}
                {result?.exceededTimeLimit ? ' · over limit' : ''}
              </p>
            </div>
          </div>

          <div className="flex flex-col items-center gap-1 rounded-xl border border-brand-100 bg-brand-50 px-5 py-3">
            <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-brand-700">
              <Zap className="h-3.5 w-3.5" /> XP earned
            </span>
            <span className="text-2xl font-bold text-brand-700">+{formatNumber(result?.xpEarned ?? 0)}</span>
            <span className="text-[11px] text-brand-600">Level {user?.level ?? 1} · {formatNumber(user?.xp ?? 0)} XP</span>
          </div>
        </div>

        {(result?.bonuses ?? []).length ? (
          <div className="flex flex-wrap gap-2">
            {result.bonuses.map((bonus) => (
              <span key={bonus.key} className="chip border border-brand-100 bg-brand-50 text-brand-700">
                <Sparkles className="h-3.5 w-3.5" /> {bonus.label} · +{bonus.amount} XP
              </span>
            ))}
          </div>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-3.5">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-500">
              <Target className="h-3.5 w-3.5" /> Improvement
            </p>
            <p className="mt-1 text-lg font-semibold text-ink-900">
              {result?.improvement > 0 ? `+${result.improvement}` : '±0'}
              <span className="text-xs font-normal text-ink-400"> vs best</span>
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-3.5">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-500">
              <Clock className="h-3.5 w-3.5" /> Duration
            </p>
            <p className="mt-1 text-lg font-semibold text-ink-900">{formatDuration(result?.timeTaken ?? 0)}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-3.5">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-500">
              <Trophy className="h-3.5 w-3.5" /> Attempts left
            </p>
            <p className="mt-1 text-lg font-semibold text-ink-900">{attempts?.remaining ?? 0}</p>
          </div>
        </div>

        {newAchievements.length ? (
          <div className="rounded-2xl border border-amber-100 bg-amber-50/70 p-4">
            <p className="flex items-center gap-1.5 text-sm font-semibold text-amber-800">
              <Award className="h-4 w-4" /> Achievement unlocked
            </p>
            <ul className="mt-3 space-y-2">
              {newAchievements.map((achievement) => (
                <li key={achievement.key} className="flex items-center gap-3">
                  <AchievementIcon icon={achievement.icon} tier={achievement.tier} size="sm" />
                  <div>
                    <p className="text-sm font-semibold text-ink-800">{achievement.name}</p>
                    <p className="text-xs text-ink-600">{achievement.description}</p>
                  </div>
                  {achievement.xpReward ? <span className="ml-auto chip bg-white text-amber-700">+{achievement.xpReward} XP</span> : null}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div>
          <h3 className="mb-3 text-sm font-semibold text-ink-800">Score breakdown</h3>
          {breakdown?.groups ? (
            <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
              {breakdown.groups.map((group) => (
                <div key={group.key} className="rounded-xl border border-slate-200 bg-white p-3 text-center">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-400">{GROUP_LABELS[group.key] ?? group.key}</p>
                  <p className="mt-1 text-base font-semibold text-ink-900">
                    {Math.round(group.earned)}
                    <span className="text-xs font-normal text-ink-400">/{Math.round(group.max)}</span>
                  </p>
                </div>
              ))}
            </div>
          ) : null}

          <TestBreakdown
            testResults={breakdown?.testResults ?? submission?.testResults ?? []}
            categoryScores={breakdown?.categoryScores ?? submission?.categoryScores ?? {}}
          />
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 pt-4">
        {!exhausted ? (
          <Button variant="secondary" icon={RotateCcw} onClick={() => onTryAgain?.()}>
            Try again
          </Button>
        ) : null}
        {submission?.id ? (
          <Button variant="ghost" to={`/submissions/${submission.id}`}>
            View submission
          </Button>
        ) : null}
        {nextChallenge ? <Button to={`/challenges/${nextChallenge.slug}`} iconRight={ArrowRight}>Next challenge: {nextChallenge.title}</Button> : null}
        {!nextChallenge && exhausted ? <Button onClick={() => onClose?.()}>Back to challenge</Button> : null}
      </div>
    </Modal>
  );
}

export default SubmissionResultModal;
