import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { CategoryIcon, Status, EmptyState } from "./UI";
import { date, duration } from "../utils/format";
export default function SubmissionTable({
  items = [],
  compact = false,
  admin = false,
}) {
  if (!items.length)
    return (
      <EmptyState
        title="Your first challenge is waiting"
        description="Complete a challenge to start building your practice history."
        to={admin ? undefined : "/challenges"}
      />
    );
  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th>Challenge</th>
            {admin && <th>User</th>}
            <th>Score</th>
            {!compact && (
              <>
                <th>Tests</th>
                <th>Attempt</th>
                <th>Time</th>
              </>
            )}
            <th>Status</th>
            <th>Date</th>
            {!admin && (
              <th>
                <span className="sr-only">Details</span>
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item._id}>
              <td>
                <div className="table-challenge">
                  <CategoryIcon
                    category={item.category || item.challengeId?.category}
                    small
                  />
                  <div>
                    {admin ? (
                      <strong>
                        {item.challengeId?.title || "Archived challenge"}
                      </strong>
                    ) : (
                      <Link to={`/history/${item._id}`}>
                        {item.challengeId?.title || "Archived challenge"}
                      </Link>
                    )}
                    <small>{item.category || item.challengeId?.category}</small>
                  </div>
                </div>
              </td>
              {admin && <td>@{item.userId?.username || "Deleted user"}</td>}
              <td>
                <strong className={item.score === 100 ? "score-perfect" : ""}>
                  {item.score}
                </strong>
                <span className="muted"> / 100</span>
              </td>
              {!compact && (
                <>
                  <td>
                    {item.testsPassed} / {item.totalTests}
                  </td>
                  <td>#{item.attemptNumber}</td>
                  <td>{duration(item.timeTaken)}</td>
                </>
              )}
              <td>
                <Status value={item.status} />
              </td>
              <td className="muted nowrap">{date(item.submittedAt)}</td>
              {!admin && (
                <td>
                  <Link
                    to={`/history/${item._id}`}
                    aria-label={`View submission for ${item.challengeId?.title}`}
                  >
                    <ArrowUpRight size={17} />
                  </Link>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
