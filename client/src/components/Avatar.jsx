import { initials } from '../utils/format';

const SIZES = {
  xs: 'h-7 w-7 text-[10px]',
  sm: 'h-9 w-9 text-xs',
  md: 'h-11 w-11 text-sm',
  lg: 'h-16 w-16 text-lg',
  xl: 'h-24 w-24 text-2xl',
};

export default function Avatar({ user, size = 'md', className = '' }) {
  const src = user?.photoUrl;
  const name = user?.name || user?.username || '?';
  return (
    <span className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-primary-500 to-indigo-600 font-semibold text-white ring-2 ring-white ${SIZES[size] || SIZES.md} ${className}`}>
      {src ? (
        <img
          src={src}
          alt={name}
          className="h-full w-full object-cover"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />
      ) : null}
      {!src && <span>{initials(name)}</span>}
      {src && (
        <span className="pointer-events-none absolute inset-0 -z-10 flex items-center justify-center">
          {initials(name)}
        </span>
      )}
    </span>
  );
}
