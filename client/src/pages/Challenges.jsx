import { useCallback, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Code2, LayoutGrid } from 'lucide-react';
import { AppLayout } from '../components/layout/AppLayout.jsx';
import { PageContainer, PageHeader } from '../components/ui/Layout.jsx';
import { ChallengeFilters } from '../components/challenges/ChallengeFilters.jsx';
import { ChallengeCard } from '../components/challenges/ChallengeCard.jsx';
import { EmptyState, ErrorState, LoadingBlock } from '../components/ui/Feedback.jsx';
import { Pagination } from '../components/ui/Controls.jsx';
import Button from '../components/ui/Button.jsx';
import { useApiResource } from '../hooks/useApiResource.js';
import { useDebouncedValue } from '../hooks/useDebouncedValue.js';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';
import challengeService from '../services/challengeService.js';

const DEFAULT_FILTERS = {
  search: '',
  category: 'all',
  difficulty: 'all',
  status: 'all',
  sort: 'recommended',
  page: 1,
};

export function Challenges() {
  useDocumentTitle('Challenges');
  const [searchParams, setSearchParams] = useSearchParams();

  const [filters, setFilters] = useState(() => ({
    search: searchParams.get('search') ?? DEFAULT_FILTERS.search,
    category: searchParams.get('category') ?? DEFAULT_FILTERS.category,
    difficulty: searchParams.get('difficulty') ?? DEFAULT_FILTERS.difficulty,
    status: searchParams.get('status') ?? DEFAULT_FILTERS.status,
    sort: searchParams.get('sort') ?? DEFAULT_FILTERS.sort,
    page: Number(searchParams.get('page') ?? DEFAULT_FILTERS.page),
  }));

  const debouncedSearch = useDebouncedValue(filters.search, 350);

  const applyFilters = (next) => {
    setFilters(next);
    const params = {};
    if (next.search) params.search = next.search;
    if (next.category !== 'all') params.category = next.category;
    if (next.difficulty !== 'all') params.difficulty = next.difficulty;
    if (next.status !== 'all') params.status = next.status;
    if (next.sort !== DEFAULT_FILTERS.sort) params.sort = next.sort;
    if (next.page > 1) params.page = String(next.page);
    setSearchParams(params, { replace: true });
  };

  const request = useCallback(
    () =>
      challengeService.list({
        search: debouncedSearch || undefined,
        category: filters.category === 'all' ? undefined : filters.category,
        difficulty: filters.difficulty === 'all' ? undefined : filters.difficulty,
        status: filters.status === 'all' ? undefined : filters.status,
        sort: filters.sort,
        page: filters.page,
        limit: 9,
      }),
    [debouncedSearch, filters.category, filters.difficulty, filters.status, filters.sort, filters.page],
  );

  const { data: challenges, meta, error, loading, refetch } = useApiResource(request, [
    debouncedSearch,
    filters.category,
    filters.difficulty,
    filters.status,
    filters.sort,
    filters.page,
  ]);

  const solvedCount = useMemo(() => (challenges ?? []).filter((challenge) => challenge.progress?.solved).length, [challenges]);
  const facets = meta?.facets ?? null;
  const hasFilters =
    Boolean(filters.search) ||
    filters.category !== 'all' ||
    filters.difficulty !== 'all' ||
    filters.status !== 'all' ||
    filters.sort !== DEFAULT_FILTERS.sort;

  return (
    <AppLayout>
      <PageContainer>
        <PageHeader
          icon={Code2}
          title="Challenges"
          description="Real-world HTML, CSS and JavaScript tasks with automatic scoring and instant feedback."
          actions={
            meta ? (
              <span className="chip border border-slate-200 bg-white text-ink-600">
                <LayoutGrid className="h-3.5 w-3.5" /> {meta.total} challenges · {solvedCount} solved on this page
              </span>
            ) : null
          }
        />

        <ChallengeFilters filters={filters} onChange={applyFilters} facets={facets} onReset={() => applyFilters(DEFAULT_FILTERS)} />

        <div className="mt-6">
          {loading && !challenges ? (
            <LoadingBlock label="Loading the catalogue…" />
          ) : error ? (
            <ErrorState error={error} onRetry={refetch} />
          ) : (challenges ?? []).length ? (
            <>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {challenges.map((challenge) => (
                  <ChallengeCard key={challenge.id} challenge={challenge} />
                ))}
              </div>
              <Pagination
                page={meta?.page ?? 1}
                pages={meta?.pages ?? 1}
                total={meta?.total}
                onChange={(page) => applyFilters({ ...filters, page })}
                className="mt-6"
              />
            </>
          ) : (
            <EmptyState
              icon={Code2}
              title={hasFilters ? 'No challenges match those filters' : 'The catalogue is empty'}
              description={
                hasFilters
                  ? 'Try a different category, difficulty or search term — or reset the filters to see everything.'
                  : 'An admin needs to publish challenges before the team can practise.'
              }
              action={hasFilters ? <Button onClick={() => applyFilters(DEFAULT_FILTERS)}>Reset filters</Button> : null}
            />
          )}
        </div>
      </PageContainer>
    </AppLayout>
  );
}

export default Challenges;
