import {
  Award,
  Trophy,
  Flame,
  Code2,
  Star,
  LockKeyhole,
  Check,
} from "lucide-react";
import { date, metricValue } from "../utils/format";
export default function AchievementBadge({
  achievement,
  earnedAt,
  user,
  compact = false,
}) {
  const Icon =
    achievement.metric === "longestStreak"
      ? Flame
      : achievement.metric === "bestScore"
        ? Star
        : ["CSS", "JavaScript"].includes(achievement.metric)
          ? Code2
          : achievement.threshold === 1
            ? Award
            : Trophy;
  const unlocked = !!earnedAt,
    progress = Math.min(
      achievement.threshold,
      metricValue(user || {}, achievement.metric),
    );
  return (
    <div
      className={`achievement-card ${unlocked ? "unlocked" : "locked"} ${compact ? "compact" : ""}`}
    >
      <div className="achievement-top">
        <span>
          {unlocked ? (
            <>
              <Check size={12} />
              Unlocked
            </>
          ) : (
            <>
              <LockKeyhole size={12} />
              Keep going
            </>
          )}
        </span>
        {unlocked && <span className="achievement-spark">✦</span>}
      </div>
      <div className={`achievement-emblem ${achievement.metric}`}>
        <div>
          <Icon size={compact ? 25 : 34} />
        </div>
      </div>
      <h3>{achievement.name}</h3>
      <p>{achievement.description}</p>
      {unlocked ? (
        <span className="achievement-date">Earned {date(earnedAt)}</span>
      ) : (
        <div className="achievement-progress">
          <div className="progress-track">
            <span
              style={{ width: `${(progress / achievement.threshold) * 100}%` }}
            />
          </div>
          <span>
            {progress} / {achievement.threshold}
          </span>
        </div>
      )}
    </div>
  );
}
