import { useState } from "react";
import { useResource } from "../../hooks/useResource";
import { adminService } from "../../services/adminService";
import {
  PageHeader,
  Skeleton,
  ErrorState,
  Pagination,
} from "../../components/UI";
import SubmissionTable from "../../components/SubmissionTable";
export default function AdminSubmissions() {
  const [page, setPage] = useState(1);
  const resource = useResource(
    (signal) => adminService.submissions({ page, limit: 20 }, signal),
    [page],
  );
  return (
    <>
      <PageHeader
        eyebrow="ADMINISTRATION / SUBMISSIONS"
        title="See the work behind the progress."
        description="A real-time look at your community’s practice history."
      />
      {resource.loading ? (
        <Skeleton rows={4} />
      ) : resource.error ? (
        <ErrorState error={resource.error} retry={resource.reload} />
      ) : (
        <section className="panel no-padding">
          <div className="table-heading">
            <h2>All submissions</h2>
            <span>{resource.data.total} attempts</span>
          </div>
          <SubmissionTable items={resource.data.items} admin />
          <Pagination
            page={page}
            total={resource.data.total}
            onChange={setPage}
          />
        </section>
      )}
      <p className="page-footnote">
        For privacy, source code is available only to the submission’s owner.
        Admin monitoring includes scores, test counts, attempts, and timing.
      </p>
    </>
  );
}
