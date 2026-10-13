import { EmptyState, SkeletonRows } from '../ui/Feedback.jsx';
import { Pagination } from '../ui/Controls.jsx';
import { Inbox } from 'lucide-react';

/**
 * Thin table wrapper shared by the admin screens: loading skeletons, empty
 * state and pagination in one place.
 */
export function AdminTable({ columns, rows, loading, emptyTitle = 'Nothing here yet', emptyDescription, meta, onPage, renderRow, className = '' }) {
  if (loading && !rows?.length) return <SkeletonRows rows={6} className={className} />;

  if (!rows?.length) {
    return <EmptyState icon={Inbox} title={emptyTitle} description={emptyDescription} className={className} />;
  }

  return (
    <div className={className}>
      <div className="overflow-x-auto">
        <table className="table-base min-w-[48rem]">
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column.key} className={column.align === 'right' ? 'text-right' : undefined} style={column.width ? { width: column.width } : undefined}>
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>{rows.map((row) => renderRow(row))}</tbody>
        </table>
      </div>

      {meta && onPage ? <Pagination className="mt-4" page={meta.page} pages={meta.pages} total={meta.total} onChange={onPage} /> : null}
    </div>
  );
}

export default AdminTable;
