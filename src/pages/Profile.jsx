import { Link, useParams } from "react-router-dom";
import {
  Pencil,
  Zap,
  Trophy,
  Flame,
  CheckCircle2,
  CalendarDays,
  Target,
  ArrowRight,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useResource } from "../hooks/useResource";
import { userService } from "../services/userService";
import { submissionService } from "../services/submissionService";
import {
  Avatar,
  Badge,
  PageHeader,
  SectionHeading,
  Skeleton,
  ErrorState,
  EmptyState,
} from "../components/UI";
import Progress from "../components/Progress";
import ActivityCalendar from "../components/ActivityCalendar";
import SubmissionTable from "../components/SubmissionTable";
import AchievementBadge from "../components/AchievementBadge";
import { number, date } from "../utils/format";
export default function Profile() {
  const { username } = useParams();
  const { user } = useAuth();
  const own = !username || username === user.username;
  const resource = useResource(
    async (signal) => {
      const [profile, history] = await Promise.all([
        own ? userService.me(signal) : userService.profile(username, signal),
        own
          ? submissionService.list({ limit: 4 }, signal)
          : Promise.resolve(null),
      ]);
      return { profile, history };
    },
    [username, own],
  );
  if (resource.loading) return <Skeleton rows={5} />;
  if (resource.error)
    return <ErrorState error={resource.error} retry={resource.reload} />;
  const { profile: u, history } = resource.data;
  return (
    <>
      <PageHeader
        title={own ? "Your developer story." : `${u.name}’s developer story.`}
        description="Built one challenge, one breakthrough, one day at a time."
      />
      <section className="profile-cover">
        <div className="profile-cover-art">
          <span>{"<build. learn. repeat />"}</span>
          <div />
          <i />
          <b>✦</b>
        </div>
        <div className="profile-identity">
          <Avatar user={u} size="profile-avatar" />
          <div>
            <div className="profile-name">
              <h2>{u.name}</h2>
              <Badge tone="purple">Level {u.level}</Badge>
            </div>
            <p>@{u.username}</p>
          </div>
          {own && (
            <Link className="btn btn-secondary" to="/settings">
              <Pencil size={14} />
              Edit profile
            </Link>
          )}
        </div>
        <div className="profile-bio">
          <p>
            {u.bio ||
              (own
                ? "Your story is still being written. Add a bio to introduce yourself."
                : "A curious mind, building something new.")}
          </p>
          <span>
            <CalendarDays size={14} />
            Building since {date(u.createdAt)}
          </span>
        </div>
      </section>
      <div className="profile-stats">
        {[
          [Zap, "Total XP", number(u.xp)],
          [CheckCircle2, "Challenges solved", u.challengesSolved],
          [Flame, "Current streak", `${u.currentStreak} days`],
          [Trophy, "Longest streak", `${u.longestStreak} days`],
          [Target, "Average score", `${number(u.averageScore)}%`],
          [Trophy, "Best score", `${number(u.bestScore)}%`],
        ].map(([Icon, label, value]) => (
          <div key={label}>
            <Icon size={18} />
            <strong>{value}</strong>
            <span>{label}</span>
          </div>
        ))}
      </div>
      <div className="dashboard-columns profile-columns">
        <div className="dashboard-primary">
          <section className="panel">
            <SectionHeading
              title="Practice activity"
              description="Consistency is a skill, too."
            />
            <ActivityCalendar activity={u.activity} />
          </section>
          <section className="panel">
            <SectionHeading
              title="Milestones collected"
              description="Every badge tells a story."
              to={own ? "/achievements" : undefined}
            />
            {u.achievements.length ? (
              <div className="profile-badges">
                {u.achievements
                  .filter((a) => a.achievementId)
                  .slice(0, 3)
                  .map((a) => (
                    <AchievementBadge
                      key={a._id}
                      achievement={a.achievementId}
                      earnedAt={a.earnedAt}
                      user={u}
                      compact
                    />
                  ))}
              </div>
            ) : (
              <EmptyState
                title="The first milestone is just ahead"
                description="Achievements appear here when their requirements are met."
              />
            )}
          </section>
        </div>
        <div className="dashboard-secondary">
          <section className="panel">
            <SectionHeading
              title="The learning path"
              description="Skills taking shape."
            />
            <Progress progress={u.progress} />
          </section>
          <div className="profile-quote">
            <span>“</span>
            <p>
              The best way to learn to build
              <br />
              is to build something.
            </p>
            <Link to="/challenges">
              Find your next challenge
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </div>
      {own && (
        <section className="panel profile-history">
          <SectionHeading
            title="Recent submissions"
            to="/history"
            link="View history"
          />
          <SubmissionTable items={history.items} compact />
        </section>
      )}
    </>
  );
}
