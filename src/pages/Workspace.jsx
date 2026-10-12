import { lazy, Suspense, useEffect, useState, useRef } from "react";
import { Link, useParams, useBlocker } from "react-router-dom";
import {
  ArrowLeft,
  Play,
  RotateCcw,
  Send,
  Lightbulb,
  ChevronDown,
  Clock3,
  Zap,
  CheckCircle2,
  FileCode2,
  ShieldCheck,
  AlertCircle,
} from "lucide-react";
import { challengeService } from "../services/challengeService";
import { submissionService } from "../services/submissionService";
import { useResource } from "../hooks/useResource";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import {
  Button,
  Badge,
  Difficulty,
  Modal,
  Skeleton,
  ErrorState,
} from "../components/UI";
import Preview from "../components/Preview";
import SubmissionResult from "../components/SubmissionResult";
const CodeEditor = lazy(() => import("../components/CodeEditor"));
const files = [
  ["htmlCode", "index.html", "html"],
  ["cssCode", "style.css", "css"],
  ["jsCode", "script.js", "javascript"],
];
export default function Workspace() {
  const { id } = useParams();
  const resource = useResource(
    async (signal) => {
      const [challenge, progress, next] = await Promise.all([
        challengeService.get(id, signal),
        challengeService.progress(id, signal),
        challengeService.list({ limit: 10 }, signal),
      ]);
      return {
        challenge,
        progress,
        next: next.items.find((c) => c._id !== id && !c.completed),
      };
    },
    [id],
  );
  if (resource.loading)
    return (
      <div className="workspace-loading">
        <Skeleton rows={5} />
      </div>
    );
  if (resource.error)
    return <ErrorState error={resource.error} retry={resource.reload} />;
  return <WorkspaceContent key={id} {...resource.data} />;
}
function WorkspaceContent({ challenge: c, progress, next }) {
  const initialCode = {
    htmlCode: c.starterHTML,
    cssCode: c.starterCSS,
    jsCode: c.starterJS,
  };
  const [code, setCode] = useState(initialCode),
    [preview, setPreview] = useState(initialCode),
    [runId, setRunId] = useState(0),
    [tab, setTab] = useState("htmlCode");
  const [busy, setBusy] = useState(false),
    [result, setResult] = useState(null),
    [showResult, setShowResult] = useState(false),
    [reset, setReset] = useState(false),
    [attempts, setAttempts] = useState(progress.attempts),
    [dirty, setDirty] = useState(false),
    [error, setError] = useState("");
  const startedAt = useRef(Date.now());
  const toast = useToast();
  const { refresh } = useAuth();
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      (dirty || busy) && currentLocation.pathname !== nextLocation.pathname,
  );
  useEffect(() => {
    const prevent = (e) => {
      if (dirty || busy) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", prevent);
    return () => window.removeEventListener("beforeunload", prevent);
  }, [dirty, busy]);
  const file = files.find((f) => f[0] === tab);
  const tooLong = Object.values(code).some((v) => v.length > 50000);
  async function submit() {
    setBusy(true);
    setError("");
    try {
      const data = await submissionService.submit({
        challengeId: c._id,
        ...code,
        timeTaken: Math.min(
          86400,
          Math.round((Date.now() - startedAt.current) / 1000),
        ),
      });
      setAttempts(data.submission.attemptNumber);
      setResult(data);
      setDirty(false);
      setShowResult(true);
      setPreview(code);
      setRunId((v) => v + 1);
      refresh().catch(() => {});
    } catch (err) {
      setError(err.message);
      toast(err.message, "error");
      if (err.status === 409 || err.status === 0)
        challengeService
          .progress(c._id)
          .then((p) => setAttempts(p.attempts))
          .catch(() => {});
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="workspace-toolbar">
        <div className="workspace-title">
          <Link
            to="/challenges"
            className="back-button"
            aria-label="Back to challenges"
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1>{c.title}</h1>
            <span>
              {c.category} challenge <i /> {attempts} of {c.maxAttempts}{" "}
              attempts used
            </span>
          </div>
          <Difficulty value={c.difficulty} />
        </div>
        <div className="workspace-actions">
          <Button
            aria-label="Reset"
            variant="ghost"
            onClick={() => setReset(true)}
            disabled={busy}
          >
            <RotateCcw size={15} />
            <span>Reset</span>
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              setPreview({ ...code });
              setRunId((v) => v + 1);
            }}
            disabled={tooLong}
          >
            <Play size={15} />
            Run
          </Button>
          <Button
            loading={busy}
            onClick={submit}
            disabled={
              attempts >= c.maxAttempts ||
              tooLong ||
              !Object.values(code).some((v) => v.trim())
            }
          >
            <Send size={15} />
            Submit
          </Button>
        </div>
      </div>
      <div className="workspace-grid">
        <aside className="challenge-instructions">
          <div className="workspace-panel-heading">
            <span>
              <FileCode2 size={15} />
              The challenge
            </span>
            <Badge tone="purple">{c.category}</Badge>
          </div>
          <div className="instructions-content">
            <div className="instruction-meta">
              <span>
                <Zap size={15} />
                {c.xp} XP
              </span>
              <span>
                <Clock3 size={15} />
                {Math.ceil(c.timeLimit / 60)} min suggested
              </span>
            </div>
            <h2>{c.title}</h2>
            <p>{c.description}</p>
            <h3>What you’ll build</h3>
            <ol className="requirements">
              {c.instructions.map((instruction, i) => (
                <li key={i}>
                  <span>{i + 1}</span>
                  <p>{instruction}</p>
                </li>
              ))}
            </ol>
            {c.hints.length > 0 && (
              <details className="hints">
                <summary>
                  <Lightbulb size={17} />
                  Need a little nudge?
                  <ChevronDown size={15} />
                </summary>
                <ul>
                  {c.hints.map((hint, i) => (
                    <li key={i}>{hint}</li>
                  ))}
                </ul>
              </details>
            )}
            <div className="workspace-guidance">
              <ShieldCheck size={18} />
              <div>
                <strong>A safe space to experiment</strong>
                <p>
                  Run your code in an isolated preview. Submit when you’re ready
                  for static validation.
                </p>
              </div>
            </div>
            <div className="attempt-note">
              <strong>
                {Math.max(0, c.maxAttempts - attempts)} attempts remaining
              </strong>
              <p>
                All submissions count toward the limit. The suggested timer
                isn’t enforced.
              </p>
            </div>
            {progress.completed && (
              <div className="completed-label">
                <CheckCircle2 size={16} />
                You’ve already solved this challenge.
              </div>
            )}
            {error && (
              <div role="alert" className="inline-error">
                <AlertCircle size={16} />
                {error}
              </div>
            )}
            {tooLong && (
              <div role="alert" className="inline-error">
                Each file must be 50,000 characters or fewer.
              </div>
            )}
          </div>
        </aside>
        <section className="editor-panel">
          <div className="editor-tabs" role="tablist" aria-label="Source files">
            {files.map(([key, label]) => (
              <button
                role="tab"
                aria-selected={tab === key}
                className={tab === key ? "active" : ""}
                key={key}
                onClick={() => setTab(key)}
              >
                <span className={`file-dot ${key}`} />
                {label}
                {dirty && tab === key && <i />}
              </button>
            ))}
          </div>
          <div className="editor-container">
            <Suspense fallback={<Skeleton rows={4} />}>
              <CodeEditor
                language={file[2]}
                value={code[tab]}
                readOnly={busy}
                path={`${c._id}/${file[1]}`}
                onChange={(value) => {
                  setCode((old) => ({ ...old, [tab]: value }));
                  setDirty(true);
                }}
              />
            </Suspense>
          </div>
          <div className="workspace-status">
            <span>
              {file[2]}
              <i />
              UTF-8
            </span>
            <span>
              {code[tab].length.toLocaleString()} characters
              <i />
              {dirty ? "Unsaved changes" : "Ready to build"}
            </span>
          </div>
        </section>
        <Preview code={preview} runId={runId} />
      </div>
      <div className="workspace-bottom-note">
        <Lightbulb size={14} />
        <span>
          Make a change, press Run, see what happens. That’s where learning
          starts.
        </span>
        <span>Preview updates when you press Run.</span>
      </div>
      <Modal
        open={reset}
        onClose={() => setReset(false)}
        title="Start with a clean slate?"
      >
        <p className="modal-copy">
          This replaces all three files with the challenge’s starter code. Your
          unsaved changes will be lost.
        </p>
        <div className="modal-actions">
          <Button variant="secondary" onClick={() => setReset(false)}>
            Keep editing
          </Button>
          <Button
            onClick={() => {
              setCode(initialCode);
              setPreview(initialCode);
              setRunId((v) => v + 1);
              setReset(false);
              setDirty(false);
            }}
          >
            Reset code
          </Button>
        </div>
      </Modal>
      <Modal
        open={showResult}
        onClose={() => setShowResult(false)}
        title="Your submission"
        wide
      >
        {result && (
          <SubmissionResult
            result={result}
            maxAttempts={c.maxAttempts}
            onRetry={() => {
              setShowResult(false);
              startedAt.current = Date.now();
            }}
            nextChallenge={next}
          />
        )}
      </Modal>
      <Modal
        open={blocker.state === "blocked"}
        onClose={() => blocker.reset?.()}
        title={
          busy ? "Your submission is still running" : "Leave your workspace?"
        }
      >
        <p className="modal-copy">
          {busy
            ? "Wait for the result before leaving. A request already sent may still be recorded."
            : "Your unsaved code will be lost. Stay here to submit it, or leave without saving."}
        </p>
        <div className="modal-actions">
          <Button variant="secondary" onClick={() => blocker.reset?.()}>
            Keep coding
          </Button>
          <Button disabled={busy} onClick={() => blocker.proceed?.()}>
            Leave workspace
          </Button>
        </div>
      </Modal>
    </>
  );
}
