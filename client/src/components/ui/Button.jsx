import { Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';

const VARIANTS = {
  primary: 'btn-primary',
  secondary: 'btn-secondary',
  ghost: 'btn-ghost',
  danger: 'btn-danger',
};

const SIZES = {
  sm: 'btn-sm',
  md: '',
  lg: 'px-5 py-3 text-base',
};

/**
 * One button for the whole app. Renders a <Link> when `to` is provided so
 * navigation stays accessible and keyboard friendly.
 */
export function Button({
  children,
  variant = 'primary',
  size = 'md',
  to,
  href,
  icon: Icon,
  iconRight: IconRight,
  loading = false,
  disabled = false,
  className = '',
  type = 'button',
  ...rest
}) {
  const classes = `${VARIANTS[variant] ?? VARIANTS.primary} ${SIZES[size] ?? ''} ${className}`.trim();
  const content = (
    <>
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : Icon ? <Icon className="h-4 w-4" /> : null}
      <span>{children}</span>
      {IconRight ? <IconRight className="h-4 w-4" /> : null}
    </>
  );

  if (to) {
    return (
      <Link to={to} className={classes} {...rest}>
        {content}
      </Link>
    );
  }

  if (href) {
    return (
      <a href={href} className={classes} target="_blank" rel="noreferrer" {...rest}>
        {content}
      </a>
    );
  }

  return (
    <button type={type} className={classes} disabled={disabled || loading} {...rest}>
      {content}
    </button>
  );
}

export default Button;
