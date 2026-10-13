import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Clock, FileText, RotateCcw, Trophy, Zap } from 'lucide-react';
import { AppLayout } from '../components/layout/AppLayout.jsx';
import { PageContainer, PageHeader, Section } from '../components/ui/Layout.jsx';
import { CategoryBadge, DifficultyBadge, StatusBadge } from '../components/ui/Badge.jsx';
import { ErrorState, LoadingBlock } from '../components/ui/Feedback.jsx';
import { SegmentedControl } from '../components/ui/Controls.jsx';
import Button from '../components/ui/Button.jsx';
import { CodeEditor } from '../components/workspace/CodeEditor.jsx';
import TestBreakdown from '../components/submissions/TestBreakdown.jsx';
import { useApiResource } from '../hooks/useApiResource.js';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';
import submissionService from '../services/submissionService.js';
import { formatDateTime, formatDuration, formatNumber } from '../lib/format.js';

const TABS = [
  { value: 'html', label: 'HTML' },
  { value: 'css', label: 'CSS' },
  { value: 'js', label: 'JavaScript' },
];

export function SubmissionDetail() {
  const { id } = useParams();
  useDocumentTitle('Submission');

  const request = useCallback(() => submissionService.get(id), [id]);
  const { data: submission, error, loading, refetch } = useApiResource(request, [id]);
  const [tab, setTab] = useState('html');

  useEffect(() => {
    if (submission?.challenge?.category === 'CSS' && !submission.htmlCode?.trim()) setTab('css');
    else if (submission?.challenge?.category === 'JavaScript' && !submission.htmlCode?.trim()) setTab('js');
  }, [submission]);

  if (loading && !submission) {
    return (
      <AppLayout>
        <PageContainer>
          <LoadingBlock label="Loading submission…" />
        </PageContainer>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout>
        <PageContainer>
          <ErrorState error={error} onRetry={refetch} />
        </PageContainer>
      </AppLayout>
    );
  }

  if (!submission) return null;

  const passed = submission.status === 'passed';
  const code = { html: submission.htmlCode ?? '', css: submission.cssCode ?? '', js: submission.jsCode ?? '' };

  return (
    <AppLayout>
      <PageContainer>
        <PageHeader
          icon={FileText}
          title={`${submission.challenge?.title ?? 'Submission'} · attempt ${submission.attemptNumber}`}
          description={`Submitted ${formatDateTime(submission.submittedAt)}`}
          actions={
            <>
              <Button to={`/challenges/${submission.challenge?.slug}`} variant="secondary" icon={RotateCcw}>
                Open challenge
              </Button>
              <Button to="/history" variant="ghost" icon={ArrowLeft}>
                History
              </Button>
            </>
          }
        >
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {submission.challenge ? <CategoryBadge category={submission.challenge.category} /> : null}
            {submission.challenge ? <DifficultyBadge difficulty={submission.challenge.difficulty} /> : null}
            <StatusBadge status={submission.status} />
            {submission.isPerfect ? <span className="chip border border-amber-100 bg-amber-50 text-amber-700">Perfect score</span> : null}
          </div>
        </PageHeader>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
          <div className="space-y-6">
            <Section title="Result">
              <div className="flex flex-wrap items-center gap-5">
                <div
                  className={`flex h-24 w-24 flex-col items-center justify-center rounded-2xl text-white ${
                    passed ? 'bg-gradient-to-br from-emerald-500 to-teal-500' : 'bg-gradient-to-br from-rose-500 to-orange-500'
                  }`}
                >
                  <span className="text-3xl font-bold leading-none">{submission.score}</span>
                  <span className="text-xs opacity-90">/ 100</span>
                </div>
                <dl className="grid flex-1 grid-cols-2 gap-4 text-sm">
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-ink-500">Tests</dt>
                    <dd className="font-semibold text-ink-800">
                      {submission.testsPassed} / {submission.totalTests}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-ink-500">Attempt</dt>
                    <dd className="font-semibold text-ink-800">{submission.attemptNumber}</dd>
                  </div>
                  <div>
                    <dt className="flex items-center gap-1 text-xs uppercase tracking-wide text-ink-500">
                      <Clock className="h-3 w-3" /> Time
                    </dt>
                    <dd className="font-semibold text-ink-800">{submission.timeTakenLabel ?? formatDuration(submission.timeTaken)}</dd>
                  </div>
                  <div>
                    <dt className="flex items-center gap-1 text-xs uppercase tracking-wide text-ink-500">
                      <Zap className="h-3 w-3" /> XP earned
                    </dt>
                    <dd className="font-semibold text-brand-600">+{formatNumber(submission.xpEarned ?? 0)}</dd>
                  </div>
                </dl>
              </div>

              {submission.bonusXp ? (
                <p className="mt-4 rounded-xl border border-brand-100 bg-brand-50 px-3.5 py-2.5 text-xs text-brand-700">
                  Base {submission.baseXp} XP + {submission.bonusXp} bonus XP
                  {submission.improvement > 0 ? ` · improved by ${submission.improvement} points over your previous best` : ''}
                </p>
              ) : null}

              {submission.exceededTimeLimit ? (
                <p className="mt-3 rounded-xl border border-amber-100 bg-amber-50 px-3.5 py-2.5 text-xs text-amber-800">
                  This attempt ran past the challenge time limit, so bonuses were not awarded.
                </p>
              ) : null}

              <div className="mt-5 flex flex-wrap gap-3 border-t border-slate-100 pt-4 text-xs text-ink-500">
                <span className="flex items-center gap-1.5">
                  <Trophy className="h-3.5 w-3.5" /> {submission.verification?.serverVerifiedTests ?? 0} server checks
                </span>
                <span className="flex items-center gap-1.5">
                  <Trophy className="h-3.5 w-3.5" /> {submission.verification?.sandboxVerifiedTests ?? 0} sandbox checks
                </span>
              </div>
            </Section>

            <Section title="Score breakdown">
              <TestBreakdown
                testResults={submission.testResults ?? []}
                categoryScores={submission.categoryScores ?? {}}
                challenge={submission.challenge}
              />
            </Section>
          </div>

          <div className="space-y-6">
            <Section
              title="Your code"
              actions={<SegmentedControl options={TABS} value={tab} onChange={setTab} size="sm" />}
            >
              <CodeEditor
                code={code}
                onChange={() => {}}
                activeTab={tab}
                onTabChange={setTab}
                readOnly
                className="min-h-[32rem]"
              />
            </Section>

            <Section title="Next steps">
              <div className="flex flex-wrap gap-2">
                <Button to={`/challenges/${submission.challenge?.slug}`} icon={RotateCcw}>
                  Try this challenge again
                </Button>
                <Button to="/challenges" variant="secondary">
                  Browse more challenges
                </Button>
                <Button to={`/profile`} variant="ghost">
                  See it on your profile
                </Button>
              </div>
              <p className="mt-3 text-xs text-ink-500">
                Improve the failing checks listed under “Score breakdown” and resubmit before your attempts run out.
              </p>
            </Section>
          </div>
        </div>
      </PageContainer>
    </AppLayout>
  );
}

export default SubmissionDetail;
