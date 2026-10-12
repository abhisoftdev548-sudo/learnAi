import { useState, lazy, Suspense } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  CircleX,
  Zap,
  Code2,
} from "lucide-react";
import { useResource } from "../hooks/useResource";
import { submissionService } from "../services/submissionService";
import {
  PageHeader,
  ErrorState,
  Skeleton,
  Pagination,
  Status,
  SectionHeading,
} from "../components/UI";
import SubmissionTable from "../components/SubmissionTable";
import { date, duration } from "../utils/format";
const CodeEditor = lazy(() => import("../components/CodeEditor"));
export default function History() {
  const [page, setPage] = useState(1);
  const resource = useResource(
    (signal) => submissionService.list({ page, limit: 15 }, signal),
    [page],
  );
  return (
    <>
      <PageHeader
        eyebrow="EVERY ATTEMPT COUNTS"
        title="A record of your progress."
        description="The wins, the experiments, and everything you learned along the way."
      />
      {resource.loading ? (
        <Skeleton rows={4} />
      ) : resource.error ? (
        <ErrorState error={resource.error} retry={resource.reload} />
      ) : (
        <section className="panel no-padding">
          <div className="table-heading">
            <h2>Submission history</h2>
            <span>{resource.data.total} submissions</span>
          </div>
          <SubmissionTable items={resource.data.items} />
          <Pagination
            page={page}
            limit={15}
            total={resource.data.total}
            onChange={setPage}
          />
        </section>
      )}
    </>
  );
}
export function SubmissionDetail() {
  const { id } = useParams();
  const [tab, setTab] = useState("html");
  const resource = useResource(
    (signal) => submissionService.get(id, signal),
    [id],
  );
  if (resource.loading) return <Skeleton rows={4} />;
  if (resource.error)
    return <ErrorState error={resource.error} retry={resource.reload} />;
  const s = resource.data;
  return (
    <>
      <Link to="/history" className="back-link">
        <ArrowLeft size={15} />
        Back to history
      </Link>
      <PageHeader
        title={s.challengeId?.title || "Archived challenge"}
        description={`Attempt #${s.attemptNumber} · ${date(s.submittedAt)} · ${s.category}`}
      >
        <Status value={s.status} />
        {s.challengeId && !s.challengeId.deletedAt && (
          <Link
            to={`/challenges/${s.challengeId._id}`}
            className="btn btn-primary"
          >
            Open challenge
            <ArrowRight size={15} />
          </Link>
        )}
      </PageHeader>
      <div className="submission-detail-metrics">
        {[
          ["Score", `${s.score} / 100`],
          ["Tests passed", `${s.testsPassed} / ${s.totalTests}`],
          ["Time taken", duration(s.timeTaken)],
          ["XP earned", `+${s.xpEarned} XP`],
        ].map(([label, value]) => (
          <div className="panel" key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
      <div className="detail-columns">
        <section className="panel">
          <SectionHeading
            title="Your test results"
            description="Deterministic static validation"
          />
          <div className="test-results">
            {s.testResults?.map((test, index) => (
              <div className={test.passed ? "passed" : "failed"} key={index}>
                {test.passed ? (
                  <CheckCircle2 size={17} />
                ) : (
                  <CircleX size={17} />
                )}
                <span>{test.label}</span>
                <small>{test.passed ? "Passed" : "Not passed"}</small>
              </div>
            ))}
          </div>
          <div className="info-note">
            <Code2 size={17} />
            <p>
              These checks validate code structure. They do not prove runtime
              behavior or visual correctness.
            </p>
          </div>
        </section>
        <section className="panel no-padding">
          <div className="editor-tabs">
            {["html", "css", "javascript"].map((language) => (
              <button
                className={tab === language ? "active" : ""}
                key={language}
                onClick={() => setTab(language)}
              >
                {language === "javascript"
                  ? "script.js"
                  : language === "html"
                    ? "index.html"
                    : "style.css"}
              </button>
            ))}
            <span className="read-only-label">Read only</span>
          </div>
          <Suspense fallback={<Skeleton rows={4} />}>
            <CodeEditor
              readOnly
              language={tab}
              value={s[`${tab === "javascript" ? "js" : tab}Code`] || ""}
              height="440px"
            />
          </Suspense>
        </section>
      </div>
    </>
  );
}
