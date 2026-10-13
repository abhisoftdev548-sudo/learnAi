import { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { Activity, CheckCircle2, ChevronRight, Gauge } from 'lucide-react';
import { AppLayout } from '../../components/layout/AppLayout.jsx';
import { PageContainer, PageHeader, Section, Avatar } from '../../components/ui/Layout.jsx';
import { CategoryBadge, StatusBadge } from '../../components/ui/Badge.jsx';
import { ErrorState, LoadingBlock } from '../../components/ui/Feedback.jsx';
import { FilterChips, SearchField, SelectField } from '../../components/ui/Controls.jsx';
import Button from '../../components/ui/Button.jsx';
import { AdminTable } from '../../components/admin/AdminTable.jsx';
import { StatCard } from '../../components/ui/StatCard.jsx';
import { useApiResource } from '../../hooks/useApiResource.js';
import { useDebouncedValue } from '../../hooks/useDebouncedValue.js';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';
import adminService from '../../services/adminService.js';
import { CATEGORIES } from '../../lib/constants.js';
import { formatDateTime, formatDuration } from '../../lib/format.js';

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

export function AdminSubmissions() {
  useDocumentTitle('Submissions');
  const [filters, setFilters] = useState({ search: '', category: 'all', status: 'all', sort: 'newest', page: 1 });
  const debouncedSearch = useDebouncedValue(filters.search, 300);

  const request = useCallback(
    () =>
      adminService.submissions({
        search: debouncedSearch || undefined,
        category: filters.category === 'all' ? undefined : filters.category,
        status: filters.status === 'all' ? undefined : filters.status,
        sort: filters.sort,
        page: filters.page,
        limit: 15,
      }),
    [debouncedSearch, filters.category, filters.status, filters.sort, filters.page],
  );

  const { data: submissions, meta, error, loading, refetch } = useApiResource(request, [
    debouncedSearch,
    filters.category,
    filters.status,
    filters.sort,
    filters.page,
  ]);

  const statsRequest = useCallback(() => adminService.stats(), []);
  const { data: stats } = useApiResource(statsRequest, []);

  const average = stats?.submissions?.averageScore ?? 0;
  const passRate = stats?.submissions?.passRate ?? 0;

  return (
    <AppLayout>
      <PageContainer>
        <PageHeader
          icon={Activity}
          title="Submission monitoring"
          description="Every attempt across the team, with score, attempts and grading provenance."
          actions={
            <Button to="/admin" variant="secondary">
              Admin dashboard
            </Button>
          }
        />

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total submissions" value={stats?.submissions?.total ?? 0} icon={Gauge} hint={`${stats?.submissions?.last24h ?? 0} in the last 24h`} />
          <StatCard label="Average score" value={average} icon={CheckCircle2} accent="amber" progress={average} />
          <StatCard label="Pass rate" value={`${passRate}%`} icon={CheckCircle2} accent="emerald" progress={passRate} />
          <StatCard label="Average attempts" value={stats?.submissions?.averageAttempts ?? 0} icon={Gauge} accent="sky" />
        </div>

        <div className="card mt-6 flex flex-wrap items-center gap-4 p-4">
          <SearchField
            value={filters.search}
            onChange={(value) => setFilters((current) => ({ ...current, search: value, page: 1 }))}
            placeholder="Search member or challenge…"
            className="w-full sm:w-72"
          />
          <FilterChips
            options={[{ value: 'all', label: 'All categories' }, ...CATEGORIES.map((entry) => ({ value: entry, label: entry }))]}
            value={filters.category}
            onChange={(value) => setFilters((current) => ({ ...current, category: value, page: 1 }))}
          />
          <FilterChips
            options={STATUS_FILTERS}
            value={filters.status}
            onChange={(value) => setFilters((current) => ({ ...current, status: value, page: 1 }))}
          />
          <SelectField
            aria-label="Sort submissions"
            className="ml-auto w-full sm:w-40"
            value={filters.sort}
            options={SORT_OPTIONS}
            onChange={(event) => setFilters((current) => ({ ...current, sort: event.target.value, page: 1 }))}
          />
        </div>

        <Section className="mt-6" title={meta ? `${meta.total} submission(s)` : 'Submissions'}>
          {error ? (
            <ErrorState error={error} onRetry={refetch} />
          ) : loading && !submissions ? (
            <LoadingBlock />
          ) : (
            <AdminTable
              loading={loading}
              rows={submissions ?? []}
              meta={meta}
              onPage={(page) => setFilters((current) => ({ ...current, page }))}
              columns={[
                { key: 'member', label: 'Member' },
                { key: 'challenge', label: 'Challenge' },
                { key: 'score', label: 'Score', align: 'right' },
                { key: 'tests', label: 'Tests', align: 'right' },
                { key: 'attempt', label: 'Attempt', align: 'right' },
                { key: 'time', label: 'Time', align: 'right' },
                { key: 'submitted', label: 'Submitted' },
                { key: 'status', label: 'Status' },
                { key: 'actions', label: '', align: 'right' },
              ]}
              renderRow={(submission) => (
                <tr key={submission.id} className="transition hover:bg-slate-50">
                  <td>
                    <div className="flex items-center gap-3">
                      <Avatar user={submission.user ?? {}} size={30} />
                      <div className="min-w-0">
                        <p className="truncate font-medium text-ink-800">{submission.user?.name ?? 'Unknown'}</p>
                        <p className="truncate text-xs text-ink-500">@{submission.user?.username}</p>
                      </div>
                    </div>
                  </td>
                  <td>
                    <p className="truncate text-ink-700">{submission.challenge?.title ?? '—'}</p>
                    {submission.challenge ? <CategoryBadge category={submission.challenge.category} className="mt-1" /> : null}
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
                    <Link
                      to={`/submissions/${submission.id}`}
                      className="inline-flex text-ink-400 transition hover:text-brand-600"
                      aria-label="Open submission"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                  </td>
                </tr>
              )}
            />
          )}
        </Section>
      </PageContainer>
    </AppLayout>
  );
}

export default AdminSubmissions;
