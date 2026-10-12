import { useState } from "react";
import { Link } from "react-router-dom";
import { UsersRound } from "lucide-react";
import { adminService } from "../../services/adminService";
import { useResource } from "../../hooks/useResource";
import { useToast } from "../../context/ToastContext";
import {
  PageHeader,
  Avatar,
  Badge,
  Button,
  Modal,
  Field,
  Skeleton,
  ErrorState,
  EmptyState,
  Pagination,
} from "../../components/UI";
import { date, number } from "../../utils/format";
export default function AdminUsers() {
  const [page, setPage] = useState(1),
    [selected, setSelected] = useState(null),
    [teamId, setTeamId] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const toast = useToast();
  const resource = useResource(
    async (signal) => {
      const [users, teams] = await Promise.all([
        adminService.users({ page, limit: 20 }, signal),
        adminService.teams({ limit: 100 }, signal),
      ]);
      return { users, teams };
    },
    [page],
  );
  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await adminService.assignTeam(selected._id, teamId || null);
      toast("Team membership updated.");
      setSelected(null);
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
        eyebrow="ADMINISTRATION / USERS"
        title="Meet your community."
        description="Curious minds, shared goals, and a little progress every day."
      />
      {resource.loading ? (
        <Skeleton rows={5} />
      ) : resource.error ? (
        <ErrorState error={resource.error} retry={resource.reload} />
      ) : (
        <section className="panel no-padding">
          <div className="table-heading">
            <h2>All members</h2>
            <span>{resource.data.users.total} registered</span>
          </div>
          {resource.data.users.items.length ? (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Member</th>
                    <th>Role</th>
                    <th>Level</th>
                    <th>XP</th>
                    <th>Solved</th>
                    <th>Joined</th>
                    <th>Team</th>
                  </tr>
                </thead>
                <tbody>
                  {resource.data.users.items.map((u) => (
                    <tr key={u._id}>
                      <td>
                        <Link
                          className="table-user"
                          to={`/profile/${u.username}`}
                        >
                          <Avatar user={u} />
                          <span>
                            <strong>{u.name}</strong>
                            <small>@{u.username}</small>
                          </span>
                        </Link>
                      </td>
                      <td>
                        <Badge tone={u.role === "admin" ? "purple" : ""}>
                          {u.role}
                        </Badge>
                      </td>
                      <td>{u.level}</td>
                      <td>{number(u.xp)}</td>
                      <td>{u.challengesSolved}</td>
                      <td className="nowrap muted">{date(u.createdAt)}</td>
                      <td>
                        <button
                          className="btn btn-ghost small-btn"
                          onClick={() => {
                            setSelected(u);
                            setTeamId(u.teamId || "");
                            setError("");
                          }}
                        >
                          <UsersRound size={14} />
                          {u.teamId
                            ? resource.data.teams.items.find(
                                (t) => t._id === u.teamId,
                              )?.name || "Assigned team"
                            : "Assign team"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState title="No members yet" />
          )}
          <Pagination
            page={page}
            total={resource.data.users.total}
            onChange={setPage}
          />
        </section>
      )}
      <Modal
        open={!!selected}
        onClose={() => !busy && setSelected(null)}
        title="A team to grow with"
      >
        <form onSubmit={save} className="modal-form">
          <p className="muted">
            Update team membership for <strong>{selected?.name}</strong>.
          </p>
          <Field
            label="Team ID"
            hint="Choose a suggested ID or paste another team’s ID. Leave blank to remove membership."
          >
            <input
              list="team-options"
              pattern="[a-fA-F0-9]{24}"
              value={teamId}
              onChange={(e) => setTeamId(e.target.value)}
            />
            <datalist id="team-options">
              {resource.data?.teams.items.map((team) => (
                <option key={team._id} value={team._id}>
                  {team.name}
                </option>
              ))}
            </datalist>
          </Field>
          {error && (
            <div className="inline-error" role="alert">
              {error}
            </div>
          )}
          <div className="modal-actions">
            <Button
              type="button"
              variant="secondary"
              disabled={busy}
              onClick={() => setSelected(null)}
            >
              Cancel
            </Button>
            <Button loading={busy} type="submit">
              Save membership
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
