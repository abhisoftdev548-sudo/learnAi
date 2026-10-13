import { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, History as HistoryIcon } from 'lucide-react';
import { AppLayout } from '../components/layout/AppLayout.jsx';
import { PageContainer, PageHeader, Section } from '../components/ui/Layout.jsx';
import { CategoryBadge, StatusBadge } from '../components/ui/Badge.jsx';
import { EmptyState, ErrorState, LoadingBlock } from '../components/ui/Feedback.jsx';
import { FilterChips, Pagination, SelectField } from '../components/ui/Controls.jsx';
import Button from '../components/ui/Button.jsx';
import { useApiResource } from '../hooks/useApiResource.js';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';
import submissionService from '../services/submissionService.js';
import { CATEGORIES } from '../lib/constants.js';
import { formatDateTime, formatDuration } from '../lib/format.js';

const STATUS_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'passed', label: 'Passed' },
  { value: 'failed', label: 'Failed' },
];

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'score', label: 'Highest score' },
];

export function History() {
  useDocumentTitle('Submission history');
  const [filters, setFilters] = useState({ category: 'all', status: 'all', sort: 'newest', page: 1 });

  const request = useCallback(
    () =>
      submissionService.mine({
        category: filters.category === 'all' ? undefined : filters.category,
        status: filters.status === 'all' ? undefined : filters.status,
        sort: filters.sort,
        page: filters.page,
        limit: 12,
      }),
    [filters.category, filters.status, filters.sort, filters.page],
  );

  const { data: submissions, meta, error, loading, refetch } = useApiResource(request, [
    filters.category,
    filters.status,
    filters.sort,
    filters.page,
  ]);

  return (
    <AppLayout>
      <PageContainer>
        <PageHeader
          icon={HistoryIcon}
          title="Submission history"
          description="Every attempt is stored — open one to review the code, checks and score."
          actions={<Button to="/challenges" variant="secondary">Practise more</Button>}
        />

        <div className="card flex flex-wrap items-center gap-4 p-4">
          <FilterChips
            options={[{ value: 'all', label: 'All' }, ...CATEGORIES.map((category) => ({ value: category, label: category }))]}
            value={filters.category}
            onChange={(value) => setFilters((current) => ({ ...current, category: value, page: 1 }))}
          />
          <div className="h-5 w-px bg-slate-200" />
          <FilterChips
            options={STATUS_FILTERS}
            value={filters.status}
            onChange={(value) => setFilters((current) => ({ ...current, status: value, page: 1 }))}
          />
          <SelectField
            aria-label="Sort submissions"
            className="ml-auto w-full sm:w-44"
            value={filters.sort}
            options={SORT_OPTIONS}
            onChange={(event) => setFilters((current) => ({ ...current, sort: event.target.value, page: 1 }))}
          />
        </div>

        <Section className="mt-6" title={meta ? `${meta.total} submission${meta.total === 1 ? '' : 's'}` : 'Submissions'}>
          {loading && !submissions ? (
            <LoadingBlock />
          ) : error ? (
            <ErrorState error={error} onRetry={refetch} />
          ) : (submissions ?? []).length ? (
            <>
              <div className="overflow-x-auto">
                <table className="table-base min-w-[52rem]">
                  <thead>
                    <tr>
                      <th>Challenge</th>
                      <th className="text-right">Score</th>
                      <th className="text-right">Tests</th>
                      <th className="text-right">Attempt</th>
                      <th className="text-right">Time</th>
                      <th>Submitted</th>
                      <th>Status</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {submissions.map((submission) => (
                      <tr key={submission.id} className="transition hover:bg-slate-50">
                        <td>
                          <div className="flex items-center gap-2">
                            <Link to={`/submissions/${submission.id}`} className="font-medium text-ink-800 hover:text-brand-700">
                              {submission.challenge?.title}
                            </Link>
                            {submission.challenge ? <CategoryBadge category={submission.challenge.category} /> : null}
                          </div>
                        </td>
                        <td className="text-right font-semibold text-ink-800">{submission.score}</td>
                        <td className="text-right text-ink-600">
                          {submission.testsPassed}/{submission.totalTests}
                        </td>
                        <td className="text-right text-ink-600">{submission.attemptNumber}</td>
                        <td className="text-right text-ink-600">{submission.timeTakenLabel ?? formatDuration(submission.timeTaken)}</td>
                        <td className="whitespace-nowrap text-ink-600">{formatDateTime(submission.submittedAt)}</td>
                        <td>
                          <StatusBadge status={submission.status} />
                        </td>
                        <td className="text-right">
                          <Link to={`/submissions/${submission.id}`} className="inline-flex text-ink-400 transition hover:text-brand-600" aria-label="Open submission">
                            <ChevronRight className="h-4 w-4" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <Pagination
                page={meta?.page ?? 1}
                pages={meta?.pages ?? 1}
                total={meta?.total}
                onChange={(page) => setFilters((current) => ({ ...current, page }))}
                className="mt-4"
              />
            </>
          ) : (
            <EmptyState
              icon={HistoryIcon}
              title="No submissions match these filters"
              description="Try clearing the filters, or solve a challenge to start your history."
              action={<Button to="/challenges">Browse challenges</Button>}
            />
          )}
        </Section>
      </PageContainer>
    </AppLayout>
  );
}

export default History;
