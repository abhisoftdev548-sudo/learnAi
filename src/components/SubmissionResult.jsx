import { Link } from "react-router-dom";
import { CheckCircle2, CircleX, ArrowRight, Zap, Trophy } from "lucide-react";
import { Button, Status } from "./UI";
import { duration } from "../utils/format";
export default function SubmissionResult({
  result,
  maxAttempts,
  onRetry,
  nextChallenge,
}) {
  const s = result.submission;
  return (
    <div className="submission-result">
      <div className={`result-symbol ${s.status}`}>
        <Trophy size={28} />
      </div>
      <Status value={s.status} />
      <h3>
        {s.status === "passed"
          ? "Another step forward."
          : s.status === "partial"
            ? "You’re getting there."
            : "Every attempt is progress."}
      </h3>
      <p>
        {s.status === "passed"
          ? "All static checks passed. Keep the momentum going."
          : "Review your checks, make a change, and give it another go."}
      </p>
      <div className="result-score">
        {s.score}
        <span>/ 100</span>
      </div>
      <div className="result-metrics">
        <div>
          <strong>
            {s.testsPassed} / {s.totalTests}
          </strong>
          <span>Tests passed</span>
        </div>
        <div>
          <strong>
            {s.attemptNumber} / {maxAttempts}
          </strong>
          <span>Attempt</span>
        </div>
        <div>
          <strong>{duration(s.timeTaken)}</strong>
          <span>Time taken</span>
        </div>
        <div>
          <strong className="purple-text">
            <Zap size={15} />+{s.xpEarned} XP
          </strong>
          <span>Earned</span>
        </div>
      </div>
      <div className="test-results">
        {s.testResults?.map((test, i) => (
          <div key={i} className={test.passed ? "passed" : "failed"}>
            {test.passed ? <CheckCircle2 size={16} /> : <CircleX size={16} />}
            <span>{test.label}</span>
            <small>{test.passed ? "Passed" : "Not passed"}</small>
          </div>
        ))}
      </div>
      {result.achievements?.length > 0 && (
        <div className="result-achievements">
          <Trophy size={17} />
          <span>
            Unlocked: {result.achievements.map((a) => a.name).join(", ")}
          </span>
        </div>
      )}
      <p className="result-disclaimer">
        Static checks verify code structure, not runtime behavior or visual
        correctness.
      </p>
      <div className="result-actions">
        <Button
          variant="secondary"
          onClick={onRetry}
          disabled={s.attemptNumber >= maxAttempts}
        >
          Try again
        </Button>
        <Link className="btn btn-secondary" to={`/history/${s._id}`}>
          View submission
        </Link>
        <Link
          className="btn btn-primary"
          to={
            nextChallenge ? `/challenges/${nextChallenge._id}` : "/challenges"
          }
        >
          Next challenge
          <ArrowRight size={14} />
        </Link>
      </div>
    </div>
  );
}
