import { Link } from "react-router-dom";
import { ArrowUpRight, Zap, CheckCircle2, Clock3 } from "lucide-react";
import { CategoryIcon, Difficulty } from "./UI";
export default function ChallengeCard({ challenge }) {
  return (
    <Link className="challenge-card" to={`/challenges/${challenge._id}`}>
      <div className="challenge-card-top">
        <CategoryIcon category={challenge.category} />
        <Difficulty value={challenge.difficulty} />
      </div>
      <div className="challenge-category">{challenge.category}</div>
      <h3>
        {challenge.title}
        <ArrowUpRight size={18} />
      </h3>
      <p>{challenge.description}</p>
      <div className="challenge-card-footer">
        <span className="xp-label">
          <Zap size={14} />
          {challenge.xp} XP
        </span>
        {challenge.completed ? (
          <span className="completed-label">
            <CheckCircle2 size={14} />
            Completed
          </span>
        ) : (
          <span className="muted">
            <Clock3 size={13} />
            {Math.ceil(challenge.timeLimit / 60)} min suggested
          </span>
        )}
      </div>
    </Link>
  );
}
