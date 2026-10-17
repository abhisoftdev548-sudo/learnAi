import { Rocket } from 'lucide-react';

export default function BrandLogo({ className = 'h-9 w-9', showName = true, nameClassName = '' }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <span
        role="img"
        aria-label="Growth Circle"
        className={`${className} inline-flex items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-indigo-600 text-white shadow-sm`}
      >
        <Rocket className="h-1/2 w-1/2" strokeWidth={2.2} />
      </span>
      {showName && <span className={nameClassName}>Growth Circle</span>}
    </span>
  );
}
