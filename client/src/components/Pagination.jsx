import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function Pagination({ page, pages, onChange, total }) {
  if (!pages || pages <= 1) return null;
  return (
    <div className="mt-6 flex items-center justify-between gap-3">
      <p className="text-sm text-slate-500">
        Page <span className="font-semibold text-slate-700">{page}</span> of {pages}
        {typeof total === 'number' && <> · {total} total</>}
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          className="btn-secondary !px-3"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button
          type="button"
          className="btn-secondary !px-3"
          disabled={page >= pages}
          onClick={() => onChange(page + 1)}
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
