import { useMemo } from 'react';
import { ACTIVITY_LEVEL_STYLES } from '../../lib/constants.js';
import { formatDate } from '../../lib/format.js';

const WEEKDAYS = ['Mon', '', 'Wed', '', 'Fri', '', 'Sun'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Monday-first index for a Date (0 = Monday). */
function weekdayIndex(date) {
  return (date.getDay() + 6) % 7;
}

/**
 * GitHub-style practice grid. The API returns a flat, chronological list of
 * days with a `level` (0-4); this component lays it out into weeks/columns.
 */
export function ActivityCalendar({ days = [], summary = null, className = '' }) {
  const { weeks, monthLabels } = useMemo(() => {
    if (!days.length) return { weeks: [], monthLabels: [] };

    const entries = days.map((day) => ({ ...day, date: new Date(day.date) }));
    const columns = [];
    let current = new Array(7).fill(null);

    for (const entry of entries) {
      const index = weekdayIndex(entry.date);
      if (index === 0 && current.some(Boolean)) {
        columns.push(current);
        current = new Array(7).fill(null);
      }
      current[index] = entry;
    }
    if (current.some(Boolean)) columns.push(current);

    const labels = columns.map((column, columnIndex) => {
      const first = column.find(Boolean);
      if (!first) return '';
      const month = first.date.getMonth();
      const previousFirst = columns[columnIndex - 1]?.find(Boolean);
      if (columnIndex === 0 || previousFirst?.date.getMonth() !== month) return MONTHS[month];
      return '';
    });

    return { weeks: columns, monthLabels: labels };
  }, [days]);

  return (
    <div className={className}>
      <div className="scrollbar-thin overflow-x-auto pb-1">
        <div className="inline-block min-w-full">
          <div className="mb-1 flex gap-[3px] pl-9">
            {monthLabels.map((label, index) => (
              <span key={index} className="w-[13px] text-[10px] font-medium text-ink-400">
                {label}
              </span>
            ))}
          </div>
          <div className="flex gap-[3px]">
            <div className="mr-1 flex w-8 flex-col gap-[3px] pt-[1px]">
              {WEEKDAYS.map((label, index) => (
                <span key={index} className="h-[13px] text-[10px] leading-[13px] text-ink-400">
                  {label}
                </span>
              ))}
            </div>
            {weeks.map((week, weekIndex) => (
              <div key={weekIndex} className="flex flex-col gap-[3px]">
                {week.map((day, dayIndex) => {
                  if (!day) return <span key={dayIndex} className="h-[13px] w-[13px] rounded-[3px] bg-transparent" />;
                  const level = Math.max(0, Math.min(4, day.level ?? 0));
                  return (
                    <span
                      key={day.date}
                      title={`${formatDate(day.date)} · ${day.submissions} submission${day.submissions === 1 ? '' : 's'} · ${day.xp} XP`}
                      className={`h-[13px] w-[13px] rounded-[3px] transition hover:ring-2 hover:ring-brand-300 ${ACTIVITY_LEVEL_STYLES[level]}`}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-ink-500">
          <span>
            <span className="font-semibold text-ink-700">{summary?.activeDays ?? 0}</span> active days
          </span>
          <span>
            <span className="font-semibold text-ink-700">{summary?.totalSubmissions ?? 0}</span> submissions
          </span>
          <span>
            <span className="font-semibold text-ink-700">{summary?.totalXp ?? 0}</span> XP earned
          </span>
          {summary?.averageScore ? (
            <span>
              avg <span className="font-semibold text-ink-700">{summary.averageScore}</span>
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-ink-400">
          <span>Less</span>
          {ACTIVITY_LEVEL_STYLES.map((style, index) => (
            <span key={index} className={`h-[11px] w-[11px] rounded-[3px] ${style}`} />
          ))}
          <span>More</span>
        </div>
      </div>
    </div>
  );
}

export default ActivityCalendar;
