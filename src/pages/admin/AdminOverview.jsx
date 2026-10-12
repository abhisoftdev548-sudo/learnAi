import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Users,
  Code2,
  FileCode2,
  Target,
  ArrowUpRight,
  Plus,
  Activity,
  Layers,
  Trophy,
} from "lucide-react";
import { useResource } from "../../hooks/useResource";
import { adminService } from "../../services/adminService";
import { useToast } from "../../context/ToastContext";
import {
  PageHeader,
  SectionHeading,
  Skeleton,
  ErrorState,
  EmptyState,
  Button,
  Modal,
  Field,
  Pagination,
} from "../../components/UI";
import { number } from "../../utils/format";
export default function AdminOverview({ statistics = false }) {
  const [page, setPage] = useState(1),
    [open, setOpen] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [form, setForm] = useState({ name: "", slug: "", description: "" });
  const toast = useToast();
  const resource = useResource(
    async (signal) => {
      const [overview, teams] = await Promise.all([
        adminService.overview(signal),
        adminService.teams({ page, limit: 12 }, signal),
      ]);
      return { overview, teams };
    },
    [page],
  );
  async function createTeam(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await adminService.createTeam(form);
      toast("Team created. Assign members from the Users page.");
      setOpen(false);
      setForm({ name: "", slug: "", description: "" });
      resource.reload();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageHeader
        eyebrow="TEAM ADMINISTRATION"
        title={
          statistics
            ? "Progress, in perspective."
            : "A space for your team to grow."
        }
        description={
          statistics
            ? "Real numbers, real practice. A clear view of your learning community."
            : "Keep the challenges coming and help your builders move forward."
        }
      >
        <Link className="btn btn-primary" to="/admin/challenges/new">
          <Plus size={16} />
          Create challenge
        </Link>
      </PageHeader>
      {resource.loading ? (
        <Skeleton rows={4} />
      ) : resource.error ? (
        <ErrorState error={resource.error} retry={resource.reload} />
      ) : (
        <>
          <div className="stats-grid admin-stats">
            {[
              [
                Users,
                "Team members",
                resource.data.overview.totalUsers,
                "Registered users",
              ],
              [
                Code2,
                "Active challenges",
                resource.data.overview.totalChallenges,
                "Available to practice",
              ],
              [
                FileCode2,
                "Submissions",
                resource.data.overview.totalSubmissions,
                "Every attempt recorded",
              ],
              [
                Target,
                "Average score",
                `${number(resource.data.overview.averageScore)}%`,
                "Across all submissions",
              ],
            ].map(([Icon, label, value, note]) => (
              <div className="stat-card" key={label}>
                <div className="stat-top">
                  <span>{label}</span>
                  <span className="stat-icon purple">
                    <Icon size={18} />
                  </span>
                </div>
                <strong>
                  {typeof value === "number" ? number(value) : value}
                </strong>
                <p>{note}</p>
              </div>
            ))}
          </div>
          <div className="admin-insights">
            <section className="panel">
              <span className="stat-icon green">
                <Activity size={21} />
              </span>
              <div>
                <span className="muted">Active in the last 30 days</span>
                <h2>
                  {number(resource.data.overview.activeUsers)}{" "}
                  <span>developers</span>
                </h2>
                <p>Members who made at least one submission.</p>
              </div>
            </section>
            <section className="panel">
              <span className="stat-icon orange">
                <Layers size={21} />
              </span>
              <div>
                <span className="muted">Most practiced category</span>
                <h2>
                  {resource.data.overview.mostPopularCategory ||
                    "No submissions yet"}
                </h2>
                <p>Based on lifetime submission volume.</p>
              </div>
            </section>
          </div>
          {!statistics && (
            <div className="admin-quick-links">
              {[
                [
                  "/admin/challenges",
                  Code2,
                  "Manage challenges",
                  "Create a new learning opportunity.",
                ],
                [
                  "/admin/users",
                  Users,
                  "Your community",
                  "See who’s building and learning.",
                ],
                [
                  "/admin/submissions",
                  FileCode2,
                  "Practice in action",
                  "Monitor your team’s submissions.",
                ],
              ].map(([to, Icon, label, text]) => (
                <Link className="panel" to={to} key={to}>
                  <Icon size={21} />
                  <h3>{label}</h3>
                  <p>{text}</p>
                  <ArrowUpRight size={18} />
                </Link>
              ))}
            </div>
          )}
          <section className="panel">
            <div className="section-heading">
              <div>
                <h2>Teams at a glance</h2>
                <p>Lifetime progress of current team members.</p>
              </div>
              <Button variant="secondary" onClick={() => setOpen(true)}>
                <Plus size={14} />
                New team
              </Button>
            </div>
            {resource.data.teams.items.length ? (
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Team</th>
                      <th>Members</th>
                      <th>XP</th>
                      <th>Member solves</th>
                      <th>Submissions</th>
                      <th>Average</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resource.data.teams.items.map((team) => (
                      <tr key={team._id}>
                        <td>
                          <strong>{team.name}</strong>
                          <small className="table-subtext">{team.slug}</small>
                        </td>
                        <td>{number(team.stats.members)}</td>
                        <td>{number(team.stats.xp)}</td>
                        <td>{number(team.stats.challengesSolved)}</td>
                        <td>{number(team.stats.submissions)}</td>
                        <td>{number(team.stats.averageScore)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState
                title="Bring your builders together"
                description="Create a team, then assign members from the Users page."
              />
            )}
            <Pagination
              total={resource.data.teams.total}
              limit={12}
              page={page}
              onChange={setPage}
            />
          </section>
        </>
      )}
      <Modal
        open={open}
        onClose={() => !busy && setOpen(false)}
        title="Make room for a new team"
      >
        <form onSubmit={createTeam} className="modal-form">
          <Field label="Team name">
            <input
              required
              maxLength={80}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </Field>
          <Field
            label="Team slug"
            hint="3–60 lowercase letters, numbers, or hyphens."
          >
            <input
              required
              pattern="[a-z0-9-]{3,60}"
              value={form.slug}
              onChange={(e) => setForm({ ...form, slug: e.target.value })}
            />
          </Field>
          <Field label="Description">
            <textarea
              rows={3}
              maxLength={500}
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
            />
          </Field>
          {error && (
            <div role="alert" className="inline-error">
              {error}
            </div>
          )}
          <div className="modal-actions">
            <Button
              variant="secondary"
              type="button"
              disabled={busy}
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button loading={busy} type="submit">
              Create team
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
