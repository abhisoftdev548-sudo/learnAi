import { Link } from "react-router-dom";
import {
  ArrowRight,
  ArrowUpRight,
  Zap,
  Flame,
  CheckCircle2,
  Trophy,
  TrendingUp,
  Sparkles,
  Code2,
  Target,
} from "lucide-react";
import { useResource } from "../hooks/useResource";
import { userService } from "../services/userService";
import { challengeService } from "../services/challengeService";
import { leaderboardService } from "../services/leaderboardService";
import { submissionService } from "../services/submissionService";
import {
  PageHeader,
  SectionHeading,
  ErrorState,
  Skeleton,
  Difficulty,
  CategoryIcon,
  EmptyState,
} from "../components/UI";
import Progress from "../components/Progress";
import ActivityCalendar from "../components/ActivityCalendar";
import SubmissionTable from "../components/SubmissionTable";
import { number } from "../utils/format";
export default function Dashboard() {
  const resource = useResource(async (signal) => {
    const [profile, challenges, leaderboard, history, team] = await Promise.all(
      [
        userService.me(signal),
        challengeService.list({ limit: 6 }, signal),
        leaderboardService.list({ limit: 1, period: "all-time" }, signal),
        submissionService.list({ limit: 4 }, signal),
        userService.team(signal),
      ],
    );
    return { profile, challenges, leaderboard, history, team };
  });
  if (resource.loading)
    return (
      <>
        <PageHeader
          title="Your next chapter starts here."
          description="Loading your latest progress…"
        />
        <Skeleton rows={5} />
      </>
    );
  if (resource.error)
    return <ErrorState error={resource.error} retry={resource.reload} />;
  const { profile: u, challenges, leaderboard, history, team } = resource.data;
  const recommended =
    challenges.items.find((c) => !c.completed) || challenges.items[0];
  const nextLevelXP = 100 * u.level ** 2,
    previousLevelXP = 100 * (u.level - 1) ** 2;
  const levelProgress = Math.min(
    100,
    ((u.xp - previousLevelXP) / (nextLevelXP - previousLevelXP)) * 100,
  );
  const stats = [
    [Zap, "Total XP", number(u.xp), "Every challenge counts", "purple"],
    [
      CheckCircle2,
      "Challenges solved",
      number(u.challengesSolved),
      "Skills put into practice",
      "green",
    ],
    [
      Flame,
      "Current streak",
      `${u.currentStreak}`,
      "Keep your momentum going",
      "orange",
    ],
    [
      Trophy,
      "Your ranking",
      leaderboard.me ? `#${leaderboard.me.rank}` : "—",
      "All-time leaderboard",
      "blue",
    ],
  ];
  return (
    <div className="dashboard-page">
      <PageHeader
        title={
          <>
            Welcome back, {u.name.split(" ")[0]} <span className="wave">✦</span>
          </>
        }
        description="A little progress every day adds up. Let’s make today count."
      >
        <span className="date-chip">
          <span />
          {new Date().toLocaleDateString("en", {
            weekday: "short",
            month: "short",
            day: "numeric",
          })}
        </span>
      </PageHeader>
      <section className="dashboard-hero">
        <div className="hero-copy">
          <span className="hero-eyebrow">
            <Sparkles size={14} />
            BUILD. LEARN. REPEAT.
          </span>
          <h2>
            One challenge closer
            <br />
            to your next breakthrough.
          </h2>
          <p>
            Turn what you know into what you can build.
            <br />
            Your next small win is waiting.
          </p>
          <Link to="/challenges" className="btn btn-white">
            Explore challenges
            <ArrowRight size={16} />
          </Link>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="hero-orbit orbit-one" />
          <div className="hero-orbit orbit-two" />
          <span className="hero-spark spark-one">✦</span>
          <span className="hero-spark spark-two">+</span>
          <div className="hero-code-card">
            <div>
              <i />
              <i />
              <i />
              <span>keep-building.js</span>
            </div>
            <pre>
              <span>const</span> yourFuture = {"{"}
              <br /> skills: <b>'growing'</b>,<br /> potential: <b>Infinity</b>
              <br />
              {"}"};<br />
              <br />
              <em>// Start with one challenge.</em>
              <br />
              you.<strong>keepBuilding</strong>();
            </pre>
          </div>
          <span className="hero-code-badge">
            <Code2 size={22} />
          </span>
          <div className="hero-level-badge">
            <Zap size={17} />
            <span>
              Level {u.level}
              <small>Keep moving forward</small>
            </span>
          </div>
        </div>
      </section>
      <div className="stats-grid">
        {stats.map(([Icon, label, value, note, tone]) => (
          <div className="stat-card" key={label}>
            <div className="stat-top">
              <span>{label}</span>
              <span className={`stat-icon ${tone}`}>
                <Icon size={18} />
              </span>
            </div>
            <strong>
              {value}
              {label === "Current streak" && <small> days</small>}
            </strong>
            <p>{note}</p>
          </div>
        ))}
      </div>
      <div className="dashboard-columns">
        <div className="dashboard-primary">
          <section className="panel recommended-panel">
            <SectionHeading
              title="Your next challenge"
              description="A small step. A new skill."
              to="/challenges"
              link="Browse challenges"
            />
            {recommended ? (
              <Link
                to={`/challenges/${recommended._id}`}
                className="recommendation"
              >
                <div className="recommendation-art">
                  <CategoryIcon category={recommended.category} />
                  <span>
                    {recommended.category === "HTML"
                      ? "< / >"
                      : recommended.category === "CSS"
                        ? "{ · }"
                        : "( ) =>"}
                  </span>
                </div>
                <div className="recommendation-copy">
                  <div className="recommendation-meta">
                    <span>{recommended.category}</span>
                    <Difficulty value={recommended.difficulty} />
                  </div>
                  <h3>{recommended.title}</h3>
                  <p>{recommended.description}</p>
                  <div>
                    <span className="xp-label">
                      <Zap size={14} />
                      {recommended.xp} XP
                    </span>
                    <span className="muted">
                      {Math.ceil(recommended.timeLimit / 60)} min suggested
                    </span>
                  </div>
                </div>
                <span className="recommendation-arrow">
                  <ArrowUpRight size={21} />
                </span>
              </Link>
            ) : (
              <EmptyState
                title="New challenges are on their way"
                description="Ask your team admin to publish the first challenge."
              />
            )}
          </section>
          <section className="panel recent-panel">
            <SectionHeading
              title="Recent activity"
              description="Your latest steps forward."
              to="/history"
              link="View history"
            />
            <SubmissionTable items={history.items} compact />
          </section>
          <section className="panel">
            <SectionHeading
              title="Practice, meet consistency"
              description="Every square is a little investment in yourself."
            />
            <ActivityCalendar activity={u.activity} />
          </section>
        </div>
        <div className="dashboard-secondary">
          <section className="panel learning-progress">
            <SectionHeading
              title="Your learning path"
              description="Building a well-rounded toolkit."
            />
            <Progress progress={u.progress} />
            <div className="average-score">
              <span>
                <Target size={17} />
                Average score
              </span>
              <strong>
                {number(u.averageScore)}
                <small> / 100</small>
              </strong>
            </div>
          </section>
          <section className="panel level-panel">
            <div className="level-icon">
              <TrendingUp size={25} />
            </div>
            <div>
              <span className="eyebrow">STEADY PROGRESS</span>
              <h3>Level {u.level}</h3>
              <p>
                {number(Math.max(0, nextLevelXP - u.xp))} XP to your next level
              </p>
            </div>
            <div className="progress-track">
              <span style={{ width: `${levelProgress}%` }} />
            </div>
            <div className="level-labels">
              <span>{number(u.xp)} XP</span>
              <span>{number(nextLevelXP)} XP</span>
            </div>
          </section>
          <section className="team-note">
            <span className="team-note-icon">
              <Sparkles size={20} />
            </span>
            <h3>{team ? `Growing with ${team.name}` : "Better, together."}</h3>
            <p>
              {team?.description ||
                "Challenge yourself. Learn from your team. Celebrate every little win."}
            </p>
            <Link to="/leaderboard">
              Meet the leaderboard
              <ArrowRight size={14} />
            </Link>
          </section>
        </div>
      </div>
    </div>
  );
}
