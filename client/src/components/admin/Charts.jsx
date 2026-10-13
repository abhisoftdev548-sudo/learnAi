/** Small, dependency-free chart primitives used by the admin screens. */

export function BarChart({ data = [], valueKey = 'value', labelKey = 'label', height = 160, barClassName = 'bg-brand-500', formatValue = (value) => value }) {
  const max = Math.max(1, ...data.map((entry) => Number(entry[valueKey]) || 0));

  if (!data.length) return <p className="py-8 text-center text-sm text-ink-500">No data for this period yet.</p>;

  return (
    <div>
      <div className="flex items-end gap-2" style={{ height }}>
        {data.map((entry, index) => {
          const value = Number(entry[valueKey]) || 0;
          const percent = Math.max(2, Math.round((value / max) * 100));
          return (
            <div key={entry[labelKey] ?? index} className="group flex h-full flex-1 flex-col items-center justify-end gap-2">
              <span className="text-[10px] font-semibold text-ink-500 opacity-0 transition group-hover:opacity-100">{formatValue(value)}</span>
              <div
                className={`w-full rounded-t-md transition-all duration-500 ${barClassName} group-hover:opacity-80`}
                style={{ height: `${percent}%` }}
                title={`${entry[labelKey]}: ${formatValue(value)}`}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex gap-2">
        {data.map((entry, index) => (
          <span key={entry[labelKey] ?? index} className="flex-1 truncate text-center text-[10px] text-ink-400">
            {entry[labelKey]}
          </span>
        ))}
      </div>
    </div>
  );
}

export function DistributionList({ items = [], total = 0, barClassName = 'bg-brand-400' }) {
  if (!items.length) return <p className="py-6 text-center text-sm text-ink-500">No data recorded yet.</p>;
  const max = Math.max(1, ...items.map((item) => item.value));

  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item.label}>
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-ink-700">{item.label}</span>
            <span className="text-ink-500">
              {item.value}
              {total ? <span className="text-ink-400"> · {Math.round((item.value / total) * 100)}%</span> : null}
            </span>
          </div>
          <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <div className={`h-full rounded-full ${item.barClassName ?? barClassName} transition-all duration-500`} style={{ width: `${(item.value / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

export default BarChart;
