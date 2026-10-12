import { useState, lazy, Suspense } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Save,
  ShieldCheck,
  Code2,
  ListChecks,
  FileText,
} from "lucide-react";
import { useResource } from "../../hooks/useResource";
import { challengeService } from "../../services/challengeService";
import { adminService } from "../../services/adminService";
import { useToast } from "../../context/ToastContext";
import {
  PageHeader,
  SectionHeading,
  Skeleton,
  ErrorState,
  Button,
  Field,
} from "../../components/UI";
import TestCaseBuilder from "../../components/TestCaseBuilder";
import { categories, difficulties } from "../../utils/format";
import {
  newTest,
  cleanTest,
  challengePayload,
  validateChallenge,
} from "../../utils/challengeForm";
const CodeEditor = lazy(() => import("../../components/CodeEditor"));
const empty = {
  title: "",
  description: "",
  category: "HTML",
  difficulty: "Easy",
  instructions: "",
  starterHTML: "",
  starterCSS: "",
  starterJS: "",
  testCases: [newTest()],
  maxAttempts: 10,
  timeLimit: 1800,
  xp: 50,
  hints: "",
};
export default function ChallengeForm() {
  const { id } = useParams();
  const resource = useResource(
    (signal) => (id ? challengeService.get(id, signal) : Promise.resolve(null)),
    [id],
  );
  if (resource.loading) return <Skeleton rows={5} />;
  if (resource.error)
    return <ErrorState error={resource.error} retry={resource.reload} />;
  return <ChallengeFields key={id || "new"} challenge={resource.data} />;
}
function ChallengeFields({ challenge }) {
  const [form, setForm] = useState(() =>
    challenge
      ? {
          ...Object.fromEntries(
            Object.keys(empty).map((key) => [
              key,
              challenge[key] ?? empty[key],
            ]),
          ),
          instructions: challenge.instructions.join("\n"),
          hints: challenge.hints.join("\n"),
          testCases: challenge.testCases.map(cleanTest),
        }
      : empty,
  );
  const [tab, setTab] = useState("starterHTML"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const navigate = useNavigate();
  const toast = useToast();
  const immutable = challenge?.submissionCount > 0;
  const update = (key) => (e) =>
    setForm((old) => ({ ...old, [key]: e.target.value }));
  async function save(e) {
    e.preventDefault();
    const payload = challengePayload(form);
    const validation = validateChallenge(payload);
    if (validation) {
      setError(validation);
      return;
    }
    setBusy(true);
    setError("");
    try {
      if (challenge) await adminService.updateChallenge(challenge._id, payload);
      else await adminService.createChallenge(payload);
      toast(
        challenge
          ? "Challenge updated."
          : "A new opportunity to learn. Challenge published.",
      );
      navigate("/admin/challenges");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Link className="back-link" to="/admin/challenges">
        <ArrowLeft size={15} />
        Back to challenge library
      </Link>
      <PageHeader
        title={
          challenge
            ? "Refine the challenge."
            : "Give your team something to build."
        }
        description="Clear requirements. Thoughtful checks. A worthwhile learning experience."
      />
      {immutable && (
        <div className="info-note immutable-note">
          <ShieldCheck size={19} />
          <p>
            This challenge already has submissions, so its definition is locked.
            Create a new challenge to publish different requirements.
          </p>
          <Link to="/admin/challenges/new">
            Create new
            <ArrowLeft size={14} />
          </Link>
        </div>
      )}
      <form onSubmit={save}>
        <fieldset
          disabled={immutable || busy}
          className="challenge-form-fieldset"
        >
          <div className="challenge-form-layout">
            <div className="challenge-form-main">
              <section className="panel form-section">
                <SectionHeading
                  title="01 / The basics"
                  description="Help your developers understand what they’re about to build."
                />
                <Field label="Challenge title">
                  <input
                    required
                    maxLength={150}
                    value={form.title}
                    placeholder="e.g. Build an accessible profile card"
                    onChange={update("title")}
                  />
                </Field>
                <Field label="Description">
                  <textarea
                    required
                    rows={3}
                    maxLength={5000}
                    value={form.description}
                    placeholder="The idea, the goal, and what makes it interesting…"
                    onChange={update("description")}
                  />
                </Field>
                <div className="form-grid">
                  <Field label="Category">
                    <select value={form.category} onChange={update("category")}>
                      {categories.map((c) => (
                        <option key={c}>{c}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Difficulty">
                    <select
                      value={form.difficulty}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          difficulty: e.target.value,
                          xp: { Easy: 50, Medium: 100, Hard: 200 }[
                            e.target.value
                          ],
                        })
                      }
                    >
                      {difficulties.map((d) => (
                        <option key={d}>{d}</option>
                      ))}
                    </select>
                  </Field>
                </div>
                <Field
                  label="Requirements"
                  hint="One requirement per line. Up to 30 lines."
                >
                  <textarea
                    required
                    rows={5}
                    value={form.instructions}
                    placeholder={
                      "Use a semantic article element.\nInclude a heading and an accessible image.\nAdd a contact link."
                    }
                    onChange={update("instructions")}
                  />
                </Field>
              </section>
              <section className="panel no-padding form-section">
                <div className="padded-heading">
                  <SectionHeading
                    title="02 / A starting point"
                    description="A little structure to help them get going."
                  />
                </div>
                <div className="editor-tabs">
                  {[
                    ["starterHTML", "index.html"],
                    ["starterCSS", "style.css"],
                    ["starterJS", "script.js"],
                  ].map(([key, label]) => (
                    <button
                      type="button"
                      key={key}
                      className={tab === key ? "active" : ""}
                      onClick={() => setTab(key)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <Suspense fallback={<Skeleton rows={3} />}>
                  <CodeEditor
                    language={
                      {
                        starterHTML: "html",
                        starterCSS: "css",
                        starterJS: "javascript",
                      }[tab]
                    }
                    readOnly={immutable || busy}
                    value={form[tab]}
                    height="300px"
                    onChange={(value) =>
                      setForm((old) => ({ ...old, [tab]: value }))
                    }
                  />
                </Suspense>
              </section>
              <section className="panel form-section">
                <SectionHeading
                  title="03 / Define success"
                  description="Deterministic checks that align with your requirements."
                />
                <div className="info-note">
                  <ShieldCheck size={18} />
                  <p>
                    Tests inspect HTML, CSS declarations, and JavaScript syntax.
                    They never execute code and don’t verify behavior or visual
                    output.
                  </p>
                </div>
                <TestCaseBuilder
                  tests={form.testCases}
                  disabled={immutable || busy}
                  onChange={(testCases) => setForm({ ...form, testCases })}
                />
              </section>
            </div>
            <aside className="challenge-form-aside">
              <section className="panel form-section">
                <SectionHeading title="Practice settings" />
                <Field label="Maximum attempts">
                  <input
                    required
                    type="number"
                    min={1}
                    max={100}
                    value={form.maxAttempts}
                    onChange={update("maxAttempts")}
                  />
                </Field>
                <Field
                  label="Suggested time (seconds)"
                  hint="A suggestion, not an enforced deadline."
                >
                  <input
                    required
                    type="number"
                    min={1}
                    max={86400}
                    value={form.timeLimit}
                    onChange={update("timeLimit")}
                  />
                </Field>
                <Field label="Base XP reward">
                  <input
                    required
                    type="number"
                    min={0}
                    max={1000}
                    value={form.xp}
                    onChange={update("xp")}
                  />
                </Field>
              </section>
              <section className="panel form-section">
                <SectionHeading
                  title="Helpful nudges"
                  description="Hints are optional. A little guidance goes a long way."
                />
                <Field label="Hints" hint="One hint per line, up to 20 hints.">
                  <textarea
                    rows={6}
                    value={form.hints}
                    placeholder="Try using a semantic HTML element…"
                    onChange={update("hints")}
                  />
                </Field>
              </section>
              <div className="form-publishing-note">
                <ListChecks size={22} />
                <h3>A good challenge is a clear challenge.</h3>
                <p>
                  Make sure every test is achievable from the requirements.
                  After the first submission, this definition can no longer be
                  edited.
                </p>
              </div>
            </aside>
          </div>
        </fieldset>
        {error && (
          <div className="inline-error form-error" role="alert">
            {error}
          </div>
        )}
        <div className="challenge-form-footer">
          <span>
            {immutable
              ? "Read-only published definition"
              : "Your team will be able to practice as soon as you publish."}
          </span>
          <div>
            <Link className="btn btn-secondary" to="/admin/challenges">
              Cancel
            </Link>
            <Button type="submit" loading={busy} disabled={immutable}>
              <Save size={15} />
              {challenge ? "Save challenge" : "Publish challenge"}
            </Button>
          </div>
        </div>
      </form>
    </>
  );
}
