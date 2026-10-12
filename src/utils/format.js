export const number = (value) =>
  new Intl.NumberFormat("en", { maximumFractionDigits: 1 }).format(
    Number(value) || 0,
  );
export const date = (value) =>
  value
    ? new Date(value).toLocaleDateString("en", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "—";
export const duration = (seconds) =>
  seconds >= 60
    ? `${Math.floor(seconds / 60)}m ${seconds % 60}s`
    : `${seconds || 0}s`;
export const initials = (name) =>
  (name || "You")
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
export const categories = ["HTML", "CSS", "JavaScript"];
export const difficulties = ["Easy", "Medium", "Hard"];
export const categoryClass = (category) =>
  ({ HTML: "html", CSS: "css", JavaScript: "js" })[category] || "html";
export const metricValue = (user, metric) =>
  ["CSS", "JavaScript"].includes(metric)
    ? user.categorySolved?.[metric] || 0
    : user[metric] || 0;
