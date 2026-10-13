import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Clock,
  Code2,
  Play,
  RotateCcw,
  Send,
  Sparkles,
  Timer,
} from 'lucide-react';
import { AppLayout } from '../components/layout/AppLayout.jsx';
import { PageContainer } from '../components/ui/Layout.jsx';
import { ErrorState, LoadingBlock } from '../components/ui/Feedback.jsx';
import { ConfirmDialog } from '../components/ui/Modal.jsx';
import Button from '../components/ui/Button.jsx';
import { CodeEditor } from '../components/workspace/CodeEditor.jsx';
import { PreviewPane } from '../components/workspace/PreviewPane.jsx';
import { ChallengePanel } from '../components/workspace/ChallengePanel.jsx';
import { SubmissionResultModal } from '../components/submissions/SubmissionResultModal.jsx';
import { SandboxRunner } from '../lib/sandbox.js';
import { useApiResource } from '../hooks/useApiResource.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';
import challengeService from '../services/challengeService.js';
import submissionService from '../services/submissionService.js';
import { formatClock } from '../lib/format.js';

const EMPTY_CODE = { html: '', css: '', js: '' };

export function Workspace() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { user, refresh } = useAuth();

  const challengeRequest = useCallback(() => challengeService.get(slug), [slug]);
  const { data: challenge, error, loading, refetch } = useApiResource(challengeRequest, [slug]);

  useDocumentTitle(challenge?.title ?? 'Workspace');

  const [code, setCode] = useState(EMPTY_CODE);
  const [reloadKey, setReloadKey] = useState(0);
  const [activeTab, setActiveTab] = useState('html');
  const [device, setDevice] = useState('desktop');
  const [consoleLines, setConsoleLines] = useState([]);
  const [showConsole, setShowConsole] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(null);
  const [startedAt, setStartedAt] = useState(null);

  const previewRef = useRef(null);
  const runnerRef = useRef(null);

  const preferences = user?.preferences ?? {};

  // Load starter code / restore the user's best attempt when the challenge changes.
  useEffect(() => {
    if (!challenge) return;
    setCode({
      html: challenge.starterHTML ?? '',
      css: challenge.starterCSS ?? '',
      js: challenge.starterJS ?? '',
    });
    setResult(null);
    setConsoleLines([]);
    setDirty(false);
    setReloadKey((key) => key + 1);
    const start = Date.now();
    setStartedAt(start);
    setSecondsLeft((challenge.timeLimit ?? 30) * 60);
  }, [challenge]);

  // Countdown timer.
  useEffect(() => {
    if (!startedAt || secondsLeft === null) return undefined;
    const timer = setInterval(() => {
      setSecondsLeft((current) => {
        if (current === null) return current;
        const elapsed = Math.floor((Date.now() - startedAt) / 1000);
        return Math.max(0, (challenge?.timeLimit ?? 30) * 60 - elapsed);
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [startedAt, secondsLeft, challenge?.timeLimit]);

  useEffect(() => {
    runnerRef.current = new SandboxRunner({
      onConsole: (entry) => setConsoleLines((lines) => [...lines.slice(-40), entry]),
    });
    return () => {
      runnerRef.current?.destroy();
      runnerRef.current = null;
    };
  }, []);

  const measurements = challenge?.runtimeSpec?.measurements ?? [];
  const attempts = challenge?.attempts ?? { used: 0, max: challenge?.maxAttempts ?? 3, remaining: challenge?.maxAttempts ?? 3 };
  const exhausted = attempts.exhausted || attempts.remaining <= 0;

  const updateCode = (key, value) => {
    setCode((current) => ({ ...current, [key]: value }));
    setDirty(true);
  };

  const runPreview = useCallback(() => {
    setReloadKey((key) => key + 1);
    previewRef.current?.reload?.();
  }, []);

  const resetCode = () => {
    if (!challenge) return;
    setCode({
      html: challenge.starterHTML ?? '',
      css: challenge.starterCSS ?? '',
      js: challenge.starterJS ?? '',
    });
    setDirty(false);
    setConfirmReset(false);
    setReloadKey((key) => key + 1);
    toast.info('Starter code restored.');
  };

  /** Collect the raw sandbox measurements the API needs to grade the solution. */
  const collectObservations = useCallback(async () => {
    if (!measurements.length) return {};
    const runner = runnerRef.current;
    if (!runner) return {};
    const measured = await runner.measure({ html: code.html, css: code.css, js: code.js, tests: measurements });
    const observations = {};
    for (const measurement of measurements) {
      const outcome = measured[measurement.id];
      if (outcome?.ok && outcome.values && typeof outcome.values === 'object') observations[measurement.id] = outcome.values;
    }
    return observations;
  }, [code.css, code.html, code.js, measurements]);

  const submit = async () => {
    if (!challenge || exhausted) return;
    setSubmitting(true);
    try {
      const observations = await collectObservations();
      const timeTaken = startedAt ? Math.max(1, Math.round((Date.now() - startedAt) / 1000)) : 0;
      const response = await submissionService.create({
        challengeId: challenge.id,
        htmlCode: code.html,
        cssCode: code.css,
        jsCode: code.js,
        observations,
        sandboxTicket: challenge.sandbox?.ticket ?? null,
        timeTaken,
      });
      setResult(response.data);
      const score = response.data?.result?.score ?? 0;
      const passed = response.data?.result?.passed;
      if (passed) toast.success(`Nice — ${score}/100 on ${challenge.title}.`);
      else toast.info(`Scored ${score}/100. Check the failing tests and try again.`);
      refresh();
      refetch({ silent: true });
      runPreview();
    } catch (caught) {
      if (caught.code === 'ATTEMPT_LIMIT_REACHED') {
        toast.error('You have used all attempts for this challenge.');
        refetch({ silent: true });
      } else if (caught.isAuthError) {
        toast.error('Your session expired — please sign in again.');
        navigate('/login');
      } else {
        toast.error(caught.message || 'Submission failed.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const timeWarning = secondsLeft !== null && secondsLeft <= 120;
  const timerLabel = useMemo(() => (secondsLeft === null ? '--:--' : formatClock(secondsLeft)), [secondsLeft]);

  if (loading && !challenge) {
    return (
      <AppLayout>
        <PageContainer>
          <LoadingBlock label="Opening the workspace…" />
        </PageContainer>
      </AppLayout>
    );
  }

  if (error && !challenge) {
    return (
      <AppLayout>
        <PageContainer>
          <ErrorState error={error} onRetry={refetch} />
        </PageContainer>
      </AppLayout>
    );
  }

  if (!challenge) return null;

  return (
    <AppLayout>
      <div className="border-b border-slate-200 bg-white">
        <PageContainer className="!py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Link to="/challenges" className="btn-ghost btn-sm" aria-label="Back to challenges">
                <ArrowLeft className="h-4 w-4" /> Challenges
              </Link>
              <span className="hidden text-sm text-ink-400 sm:inline">/</span>
              <span className="hidden text-sm font-medium text-ink-700 sm:inline">{challenge.title}</span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`chip border ${
                  exhausted
                    ? 'border-rose-100 bg-rose-50 text-rose-700'
                    : 'border-slate-200 bg-slate-50 text-ink-600'
                }`}
              >
                <RotateCcw className="h-3.5 w-3.5" /> {attempts.label ?? `Attempts: ${attempts.used} / ${attempts.max}`}
              </span>
              <span className={`chip border ${timeWarning ? 'border-amber-100 bg-amber-50 text-amber-700' : 'border-slate-200 bg-slate-50 text-ink-600'}`}>
                <Timer className="h-3.5 w-3.5" /> {timerLabel}
              </span>
              <Button variant="secondary" size="sm" icon={RotateCcw} onClick={() => setConfirmReset(true)} disabled={!dirty}>
                Reset
              </Button>
              <Button variant="secondary" size="sm" icon={Play} onClick={runPreview}>
                Run
              </Button>
              <Button size="sm" icon={Send} onClick={submit} loading={submitting} disabled={exhausted}>
                {exhausted ? 'No attempts left' : 'Submit'}
              </Button>
            </div>
          </div>
        </PageContainer>
      </div>

      <PageContainer className="!py-5">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] xl:grid-cols-[minmax(0,22rem)_minmax(0,1.2fr)_minmax(0,1fr)]">
          {/* Mobile order: challenge → editor → preview (see the order of these blocks) */}
          <aside className="card order-1 max-h-[70vh] p-5 lg:max-h-[calc(100vh-9rem)]">
            <ChallengePanel challenge={challenge} attempts={attempts} bestScore={challenge.bestScore} solved={challenge.solved} />
          </aside>

          <section className="order-2 flex min-h-0 flex-col gap-3">
            <CodeEditor
              code={code}
              onChange={updateCode}
              activeTab={activeTab}
              onTabChange={setActiveTab}
              preferences={preferences}
              className="min-h-[26rem] flex-1"
            />

            <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs text-ink-500">
              <span className="flex items-center gap-1.5">
                <Code2 className="h-3.5 w-3.5 text-brand-500" /> {measurements.length} behaviour check(s) run in the sandbox
              </span>
              <span className="flex items-center gap-1.5">
                <BookOpen className="h-3.5 w-3.5 text-brand-500" /> {challenge.testCount ?? 0} automated checks total
              </span>
              {dirty ? (
                <span className="ml-auto flex items-center gap-1.5 text-amber-600">
                  <AlertTriangle className="h-3.5 w-3.5" /> Unsaved changes
                </span>
              ) : (
                <span className="ml-auto flex items-center gap-1.5 text-emerald-600">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Preview up to date
                </span>
              )}
            </div>

            {exhausted ? (
              <div className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                All {attempts.max} attempts used. Review the feedback below, then move on to the next challenge.
              </div>
            ) : null}
          </section>

          <section className="order-3 flex min-h-0 flex-col gap-3">
            <PreviewPane
              ref={previewRef}
              code={{ ...code, reloadKey }}
              device={device}
              onDeviceChange={setDevice}
              showConsole={showConsole}
              onToggleConsole={() => setShowConsole((value) => !value)}
              consoleLines={consoleLines}
              className="min-h-[24rem] flex-1 xl:min-h-[calc(100vh-13rem)]"
            />

            <div className="card p-4">
              <h3 className="flex items-center gap-1.5 text-sm font-semibold text-ink-800">
                <Sparkles className="h-4 w-4 text-brand-500" /> How scoring works
              </h3>
              <ul className="mt-2 space-y-1.5 text-xs text-ink-500">
                <li>· HTML structure 20 · CSS/layout 25 · Functionality 30 · Responsiveness 15 · Code quality 10</li>
                <li>· Behaviour checks run in the sandboxed preview; structure and quality checks run on the server.</li>
                <li>· Passing score is {challenge.passingScore ?? 70}/100 — you keep your best score.</li>
              </ul>
            </div>
          </section>
        </div>
      </PageContainer>

      <ConfirmDialog
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        onConfirm={resetCode}
        title="Reset to starter code?"
        description="Your current edits in this workspace will be replaced by the challenge starter files."
        confirmLabel="Reset code"
      />

      <SubmissionResultModal
        open={Boolean(result)}
        payload={result}
        onClose={() => setResult(null)}
        onTryAgain={() => {
          setResult(null);
          setStartedAt(Date.now());
          runPreview();
        }}
      />

      <p className="pb-6 text-center text-xs text-ink-400">
        <Clock className="mr-1 inline h-3 w-3" />
        Your code is graded automatically; the sandbox never runs on the server.
      </p>
    </AppLayout>
  );
}

export default Workspace;
