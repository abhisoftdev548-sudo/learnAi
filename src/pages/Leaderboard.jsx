import { useState } from "react";
import { Link } from "react-router-dom";
import { Trophy, Crown, ArrowUpRight, Users, Zap } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useResource } from "../hooks/useResource";
import { leaderboardService } from "../services/leaderboardService";
import {
  PageHeader,
  Avatar,
  Skeleton,
  ErrorState,
  EmptyState,
  Pagination,
  Streak,
} from "../components/UI";
import { number } from "../utils/format";
export default function Leaderboard() {
  const { user } = useAuth();
  const [period, setPeriod] = useState("all-time"),
    [page, setPage] = useState(1);
  const resource = useResource(
    (signal) => leaderboardService.list({ period, page, limit: 20 }, signal),
    [period, page],
  );
  return (
    <>
      <PageHeader
        eyebrow="A LITTLE FRIENDLY COMPETITION"
        title="Great company. Greater progress."
        description="Show up, keep building, and grow alongside your team."
      >
        <span className="heading-icon">
          <Trophy size={28} />
        </span>
      </PageHeader>
      <div className="leaderboard-toolbar">
        <div className="tabs pill-tabs">
          {[
            ["weekly", "This week"],
            ["monthly", "This month"],
            ["all-time", "All time"],
          ].map(([value, label]) => (
            <button
              key={value}
              className={period === value ? "active" : ""}
              onClick={() => {
                setPeriod(value);
                setPage(1);
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <span className="muted">
          <Users size={15} />
          Ranked by XP, solves, then average score
        </span>
      </div>
      {resource.loading ? (
        <Skeleton rows={5} />
      ) : resource.error ? (
        <ErrorState error={resource.error} retry={resource.reload} />
      ) : !resource.data.total ? (
        <EmptyState
          title="The leaderboard is ready for its first builder"
          to="/challenges"
        />
      ) : (
        <>
          {page === 1 && (
            <div className="podium-grid">
              {resource.data.items.slice(0, 3).map((entry, index) => (
                <Link
                  to={`/profile/${entry.username}`}
                  className={`podium-card podium-${index}`}
                  key={entry._id}
                >
                  <div className="podium-rank">
                    {index === 0 ? <Crown size={17} /> : <Trophy size={16} />}
                    <span>
                      {
                        [
                          "Leading the way",
                          "Making moves",
                          "Building momentum",
                        ][index]
                      }
                    </span>
                    <strong>#{entry.rank}</strong>
                  </div>
                  <Avatar user={entry} size="large" />
                  <h3>{entry.name}</h3>
                  <p>
                    @{entry.username}
                    {entry._id === user._id && (
                      <span className="you-badge">You</span>
                    )}
                  </p>
                  <div className="podium-xp">
                    <Zap size={17} />
                    {number(entry.xp)}
                    <span>XP</span>
                  </div>
                  <div className="podium-footer">
                    <span>
                      {number(entry.challengesSolved)} challenges solved
                    </span>
                    <ArrowUpRight size={16} />
                  </div>
                </Link>
              ))}
            </div>
          )}
          {resource.data.me && (
            <div className="your-rank">
              <div className="your-rank-icon">
                <Trophy size={20} />
              </div>
              <div>
                <strong>Your spot on the board</strong>
                <span>Every challenge is a chance to move forward.</span>
              </div>
              <strong>#{resource.data.me.rank}</strong>
              <span className="your-rank-xp">
                {number(resource.data.me.xp)} XP
              </span>
            </div>
          )}
          <section className="panel no-padding">
            <div className="table-heading">
              <h2>The builders’ board</h2>
              <span>{resource.data.total} members</span>
            </div>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Developer</th>
                    <th>XP earned</th>
                    <th>Challenges solved</th>
                    <th>Average score</th>
                    <th>Current streak</th>
                  </tr>
                </thead>
                <tbody>
                  {resource.data.items.map((entry) => (
                    <tr
                      key={entry._id}
                      className={entry._id === user._id ? "my-row" : ""}
                    >
                      <td>
                        <span className={`rank-number rank-${entry.rank}`}>
                          {entry.rank <= 3 ? <Trophy size={15} /> : "#"}
                          {entry.rank}
                        </span>
                      </td>
                      <td>
                        <Link
                          className="table-user"
                          to={`/profile/${entry.username}`}
                        >
                          <Avatar user={entry} />
                          <span>
                            <strong>
                              {entry.name}
                              {entry._id === user._id && (
                                <span className="you-badge">You</span>
                              )}
                            </strong>
                            <small>@{entry.username}</small>
                          </span>
                        </Link>
                      </td>
                      <td>
                        <strong>{number(entry.xp)}</strong>
                      </td>
                      <td>{number(entry.challengesSolved)}</td>
                      <td>
                        {number(entry.averageScore)}
                        <span className="muted"> / 100</span>
                      </td>
                      <td>
                        <Streak value={entry.currentStreak || 0} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              page={page}
              total={resource.data.total}
              onChange={setPage}
            />
          </section>
          <p className="page-footnote">
            Weekly periods start Monday at 00:00 UTC. Streaks always show
            current lifetime practice, not the selected period.
          </p>
        </>
      )}
    </>
  );
}
