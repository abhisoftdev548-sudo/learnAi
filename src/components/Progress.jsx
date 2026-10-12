import { CategoryIcon } from "./UI";
import { categories } from "../utils/format";
export default function Progress({ progress = {} }) {
  return (
    <div className="progress-list">
      {categories.map((category) => {
        const item = progress[category] || {
          solved: 0,
          total: 0,
          percentage: 0,
        };
        return (
          <div className="progress-item" key={category}>
            <CategoryIcon category={category} small />
            <div>
              <div className="progress-label">
                <strong>{category}</strong>
                <span>
                  {item.solved}
                  <span className="muted"> / {item.total}</span>
                </span>
              </div>
              <div className="progress-track">
                <span
                  className={category.toLowerCase()}
                  style={{ width: `${Math.min(100, item.percentage)}%` }}
                />
              </div>
            </div>
            <span className="progress-percent">{item.percentage}%</span>
          </div>
        );
      })}
    </div>
  );
}
