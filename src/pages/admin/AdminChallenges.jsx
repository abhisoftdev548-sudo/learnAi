import { useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Pencil, Archive, Search } from "lucide-react";
import { challengeService } from "../../services/challengeService";
import { adminService } from "../../services/adminService";
import { useResource, useDebounce } from "../../hooks/useResource";
import { useToast } from "../../context/ToastContext";
import {
  PageHeader,
  CategoryIcon,
  Difficulty,
  Skeleton,
  ErrorState,
  EmptyState,
  Pagination,
  Button,
  Modal,
} from "../../components/UI";
export default function AdminChallenges() {
  const [page, setPage] = useState(1),
    [search, setSearch] = useState(""),
    [selected, setSelected] = useState(null),
    [busy, setBusy] = useState(false);
  const toast = useToast();
  const term = useDebounce(search);
  const resource = useResource(
    (signal) =>
      challengeService.list({ page, limit: 15, search: term }, signal),
    [page, term],
  );
  async function archive() {
    setBusy(true);
    try {
      await adminService.deleteChallenge(selected._id);
      toast("Challenge archived. Submission history is preserved.");
      setSelected(null);
      resource.reload();
    } catch (err) {
      toast(err.message, "error");
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageHeader
        eyebrow="ADMINISTRATION / CHALLENGES"
        title="Create the next breakthrough."
        description="Thoughtful challenges make better builders. This is where they begin."
      >
        <Link className="btn btn-primary" to="/admin/challenges/new">
          <Plus size={16} />
          Create challenge
        </Link>
      </PageHeader>
      <section className="panel no-padding">
        <div className="table-heading">
          <h2>Challenge library</h2>
          <div className="search-input">
            <Search size={15} />
            <input
              aria-label="Search admin challenges"
              placeholder="Search challenges…"
              value={search}
              maxLength={100}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
        </div>
        {resource.loading ? (
          <Skeleton rows={4} />
        ) : resource.error ? (
          <ErrorState error={resource.error} retry={resource.reload} />
        ) : (
          <>
            {resource.data.items.length ? (
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Challenge</th>
                      <th>Difficulty</th>
                      <th>XP</th>
                      <th>Submissions</th>
                      <th>Solved by</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resource.data.items.map((c) => (
                      <tr key={c._id}>
                        <td>
                          <div className="table-challenge">
                            <CategoryIcon category={c.category} small />
                            <div>
                              <Link to={`/challenges/${c._id}`}>{c.title}</Link>
                              <small>{c.category}</small>
                            </div>
                          </div>
                        </td>
                        <td>
                          <Difficulty value={c.difficulty} />
                        </td>
                        <td>{c.xp}</td>
                        <td>{c.submissionCount}</td>
                        <td>{c.solvedCount}</td>
                        <td>
                          <div className="table-actions">
                            <Link
                              className="icon-btn"
                              title={
                                c.submissionCount
                                  ? "View immutable definition"
                                  : "Edit challenge"
                              }
                              aria-label={`Edit ${c.title}`}
                              to={`/admin/challenges/${c._id}/edit`}
                            >
                              <Pencil size={15} />
                            </Link>
                            <button
                              className="icon-btn danger-icon"
                              onClick={() => setSelected(c)}
                              aria-label={`Archive ${c.title}`}
                            >
                              <Archive size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState
                title="Your next challenge starts here"
                description="Create a challenge for your team, or try another search."
              />
            )}
            <Pagination
              page={page}
              limit={15}
              total={resource.data.total}
              onChange={setPage}
            />
          </>
        )}
      </section>
      <Modal
        open={!!selected}
        onClose={() => !busy && setSelected(null)}
        title="Archive this challenge?"
      >
        <p className="modal-copy">
          <strong>{selected?.title}</strong> will no longer be available for
          practice. Existing submissions, scores, and achievements will be
          preserved.
        </p>
        <div className="modal-actions">
          <Button
            variant="secondary"
            disabled={busy}
            onClick={() => setSelected(null)}
          >
            Keep challenge
          </Button>
          <Button variant="danger" loading={busy} onClick={archive}>
            Archive challenge
          </Button>
        </div>
      </Modal>
    </>
  );
}
