import { Link } from "react-router-dom";
import {
  Code2,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  LoaderCircle,
  Inbox,
  X,
  Check,
  Flame,
} from "lucide-react";
import {
  Children,
  cloneElement,
  isValidElement,
  useEffect,
  useRef,
  useId,
} from "react";
import { initials, categoryClass } from "../utils/format";
export function Logo({ compact = false }) {
  return (
    <Link to="/" className="brand" aria-label="LearnAI home">
      <span className="brand-icon">
        <Code2 size={23} />
      </span>
      {!compact && (
        <span>
          learn<span className="brand-accent">ai</span>
          <span className="brand-dot">.</span>
        </span>
      )}
    </Link>
  );
}
export function Button({
  children,
  variant = "primary",
  loading = false,
  disabled = false,
  className = "",
  ...props
}) {
  return (
    <button
      className={`btn inline-flex items-center justify-center transition-colors btn-${variant} ${className}`}
      disabled={loading || disabled}
      {...props}
    >
      {loading && <LoaderCircle size={16} className="spin" />}
      {children}
    </button>
  );
}
export function Avatar({ user, size = "" }) {
  return (
    <span className={`avatar ${size}`}>
      {user?.avatar ? (
        <img
          key={user.avatar}
          src={user.avatar}
          alt=""
          referrerPolicy="no-referrer"
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
        />
      ) : null}
      <span>{initials(user?.name)}</span>
    </span>
  );
}
export function Badge({ children, tone }) {
  return <span className={`badge ${tone || ""}`}>{children}</span>;
}
export function CategoryIcon({ category, small = false }) {
  return (
    <span
      className={`category-icon ${categoryClass(category)} ${small ? "small" : ""}`}
    >
      {category === "HTML" ? (
        <Code2 size={small ? 17 : 23} />
      ) : category === "CSS" ? (
        <span>#</span>
      ) : (
        <span className="js-letters">JS</span>
      )}
    </span>
  );
}
export function Difficulty({ value }) {
  return (
    <Badge tone={value?.toLowerCase()}>
      <i />
      {value}
    </Badge>
  );
}
export function PageHeader({ eyebrow, title, description, children }) {
  return (
    <div className="page-heading">
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {children && <div className="heading-actions">{children}</div>}
    </div>
  );
}
export function SectionHeading({ title, description, to, link = "View all" }) {
  return (
    <div className="section-heading">
      <div>
        <h2>{title}</h2>
        {description && <p>{description}</p>}
      </div>
      {to && (
        <Link className="text-link" to={to}>
          {link}
          <ArrowRight size={14} />
        </Link>
      )}
    </div>
  );
}
export function EmptyState({
  title = "Nothing here just yet",
  description,
  to,
  action,
}) {
  return (
    <div className="empty-state">
      <span className="empty-icon">
        <Inbox size={25} />
      </span>
      <h3>{title}</h3>
      <p>{description || "Your progress will show up here as you practice."}</p>
      {to && (
        <Link to={to} className="btn btn-secondary">
          {action || "Explore challenges"}
          <ArrowRight size={16} />
        </Link>
      )}
    </div>
  );
}
export function ErrorState({ error, retry }) {
  return (
    <div className="error-state" role="alert">
      <AlertCircle size={25} />
      <h3>We couldn’t load this</h3>
      <p>{error?.message || "Something went wrong. Please try again."}</p>
      {retry && (
        <Button variant="secondary" onClick={retry}>
          Try again
        </Button>
      )}
    </div>
  );
}
export function Skeleton({ rows = 3 }) {
  return (
    <div className="skeleton-stack" aria-label="Loading" role="status">
      {Array.from({ length: rows }, (_, i) => (
        <div className="skeleton" key={i} />
      ))}
    </div>
  );
}
export function LoadingScreen() {
  return (
    <div className="loading-screen">
      <Logo />
      <LoaderCircle className="spin" size={24} />
      <p>Getting your workspace ready…</p>
    </div>
  );
}
export function Pagination({ page, limit = 20, total, onChange }) {
  const pages = Math.max(1, Math.ceil(total / limit));
  return (
    <div className="pagination">
      <span>
        {total
          ? `${(page - 1) * limit + 1}–${Math.min(page * limit, total)} of ${total}`
          : "0 results"}
      </span>
      <div>
        <button
          aria-label="Previous page"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
        >
          <ChevronLeft size={17} />
        </button>
        <span>
          Page {page} of {pages}
        </span>
        <button
          aria-label="Next page"
          disabled={page >= pages}
          onClick={() => onChange(page + 1)}
        >
          <ChevronRight size={17} />
        </button>
      </div>
    </div>
  );
}
export function Field({ label, error, hint, children, ...props }) {
  const id = useId();
  const decorate = (nodes) =>
    Children.map(nodes, (node) => {
      if (!isValidElement(node)) return node;
      if (["input", "textarea", "select"].includes(node.type))
        return cloneElement(node, {
          id,
          "aria-describedby":
            [hint && `${id}-hint`, error && `${id}-error`]
              .filter(Boolean)
              .join(" ") || undefined,
          "aria-invalid": !!error,
        });
      return node.props.children
        ? cloneElement(node, { children: decorate(node.props.children) })
        : node;
    });
  return (
    <div className="field" {...props}>
      <label htmlFor={id} className="field-label">
        {label}
      </label>
      {decorate(children)}
      {hint && <small id={`${id}-hint`}>{hint}</small>}
      {error && (
        <small id={`${id}-error`} className="field-error">
          {error}
        </small>
      )}
    </div>
  );
}
export function Modal({ open, onClose, title, children, wide = false }) {
  const ref = useRef(null);
  useEffect(() => {
    const dialog = ref.current;
    if (open && !dialog.open) dialog.showModal();
    else if (!open && dialog.open) dialog.close();
    const original = document.body.style.overflow;
    if (open) document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [open]);
  return (
    <dialog
      ref={ref}
      className={`modal ${wide ? "wide" : ""}`}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) {
          const r = ref.current.getBoundingClientRect();
          if (
            e.clientX < r.left ||
            e.clientX > r.right ||
            e.clientY < r.top ||
            e.clientY > r.bottom
          )
            onClose();
        }
      }}
    >
      <div className="modal-heading">
        <h2>{title}</h2>
        <button
          className="icon-btn"
          aria-label="Close dialog"
          onClick={onClose}
        >
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function Status({ value }) {
  return (
    <Badge tone={value}>
      {value === "passed" && <Check size={12} />}
      <span>
        {value?.[0]?.toUpperCase()}
        {value?.slice(1)}
      </span>
    </Badge>
  );
}
export function Streak({ value }) {
  return (
    <span className="streak">
      <Flame size={16} />
      {value} <span>day{value === 1 ? "" : "s"}</span>
    </span>
  );
}
