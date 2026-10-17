export default function BrandLogo({ className = 'h-9 w-9', showName = true, nameClassName = '' }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <span
        className={`${className} inline-flex shrink-0 items-center justify-center overflow-hidden rounded-xl shadow-sm`}
      >
        <img src="/growth-circle-logo.png" alt="Growth Circle" className="h-full w-full object-contain" />
      </span>
      {showName && <span className={nameClassName}>Growth Circle</span>}
    </span>
  );
}
