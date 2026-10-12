import { useMemo } from "react";
export default function ActivityCalendar({ activity = [] }) {
  const days = useMemo(() => {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const start = new Date(today);
    start.setUTCDate(start.getUTCDate() - 84 - ((start.getUTCDay() + 6) % 7));
    const lookup = new Map(activity.map((item) => [item._id, item.count]));
    return Array.from({ length: 91 }, (_, index) => {
      const day = new Date(start);
      day.setUTCDate(day.getUTCDate() + index);
      const key = day.toISOString().slice(0, 10);
      return {
        key,
        count: lookup.get(key) || 0,
        future: day > today,
        month: day.toLocaleDateString("en", {
          month: "short",
          timeZone: "UTC",
        }),
        date: day,
      };
    });
  }, [activity]);
  const total = days.reduce((sum, d) => sum + d.count, 0);
  return (
    <div className="activity">
      <div className="activity-summary">
        <strong>
          {total} <span>submissions in the last 13 weeks</span>
        </strong>
        <span className="muted">UTC</span>
      </div>
      <div className="activity-scroll">
        <div className="calendar-months">
          {Array.from({ length: 13 }, (_, w) => (
            <span key={w}>
              {w === 0 || days[w * 7].month !== days[(w - 1) * 7].month
                ? days[w * 7].month
                : ""}
            </span>
          ))}
        </div>
        <div className="calendar-body">
          <div className="calendar-labels">
            <span>Mon</span>
            <span>Wed</span>
            <span>Fri</span>
          </div>
          <div className="calendar-grid">
            {days.map((day) => (
              <span
                tabIndex={day.future ? -1 : 0}
                key={day.key}
                className={`calendar-cell heat-${Math.min(4, day.count)} ${day.future ? "future" : ""}`}
                title={`${day.key}: ${day.count} submission${day.count !== 1 ? "s" : ""}`}
                aria-label={`${day.key}: ${day.count} submissions`}
              />
            ))}
          </div>
        </div>
      </div>
      <div className="calendar-legend">
        <span>One small step, every day.</span>
        <div>
          Less{" "}
          {[0, 1, 2, 3, 4].map((n) => (
            <i className={`heat-${n}`} key={n} />
          ))}{" "}
          More
        </div>
      </div>
    </div>
  );
}
