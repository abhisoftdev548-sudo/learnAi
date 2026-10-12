import { useState } from "react";
import { Award, Sparkles } from "lucide-react";
import { useResource } from "../hooks/useResource";
import { userService } from "../services/userService";
import { PageHeader, ErrorState, Skeleton, EmptyState } from "../components/UI";
import AchievementBadge from "../components/AchievementBadge";
export default function Achievements() {
  const [filter, setFilter] = useState("All badges");
  const resource = useResource(async (signal) => {
    const [user, definitions] = await Promise.all([
      userService.me(signal),
      userService.achievements(signal),
    ]);
    return { user, definitions };
  });
  if (resource.loading)
    return (
      <>
        <PageHeader title="Small wins. Lasting milestones." />
        <Skeleton rows={4} />
      </>
    );
  if (resource.error)
    return <ErrorState error={resource.error} retry={resource.reload} />;
  const { user, definitions } = resource.data;
  const earned = new Map(
    user.achievements
      .filter((a) => a.achievementId)
      .map((a) => [a.achievementId._id, a.earnedAt]),
  );
  const displayed = definitions.filter(
    (a) =>
      filter === "All badges" ||
      (filter === "Unlocked" ? earned.has(a._id) : !earned.has(a._id)),
  );
  return (
    <>
      <PageHeader
        eyebrow="CELEBRATE HOW FAR YOU’VE COME"
        title="Small wins. Lasting milestones."
        description="A collection of the moments that make you a better developer."
      />
      <div className="achievements-banner">
        <div className="achievement-banner-icon">
          <Award size={39} />
        </div>
        <div>
          <span className="eyebrow">YOUR TROPHY SHELF</span>
          <h2>
            {earned.size}{" "}
            <span>of {definitions.length} achievements unlocked</span>
          </h2>
          <p>Not just badges. Proof that you showed up and put in the work.</p>
        </div>
        <Sparkles size={30} />
      </div>
      <div className="tabs category-tabs achievement-tabs">
        {["All badges", "Unlocked", "In progress"].map((label) => (
          <button
            className={filter === label ? "active" : ""}
            onClick={() => setFilter(label)}
            key={label}
          >
            {label}
            {label === "Unlocked" && <span>{earned.size}</span>}
          </button>
        ))}
      </div>
      {displayed.length ? (
        <div className="achievement-grid">
          {displayed.map((achievement) => (
            <AchievementBadge
              key={achievement._id}
              achievement={achievement}
              earnedAt={earned.get(achievement._id)}
              user={user}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          title={
            definitions.length
              ? "Your next milestone is ahead"
              : "No achievement definitions yet"
          }
          description={
            definitions.length
              ? "Finish a challenge to start your collection."
              : "Ask an administrator to run the achievement seed."
          }
          to={definitions.length ? "/challenges" : undefined}
        />
      )}
    </>
  );
}
