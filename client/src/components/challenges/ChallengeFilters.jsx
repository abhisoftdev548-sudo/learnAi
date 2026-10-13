import { LayoutGrid, ListFilter } from 'lucide-react';
import { SearchField, SelectField } from '../ui/Controls.jsx';
import { CATEGORIES, DIFFICULTIES } from '../../lib/constants.js';

const STATUS_OPTIONS = [
  { value: 'all', label: 'All challenges' },
  { value: 'solved', label: 'Solved' },
  { value: 'unsolved', label: 'Not solved' },
  { value: 'attempted', label: 'Attempted' },
];

const SORT_OPTIONS = [
  { value: 'recommended', label: 'Recommended' },
  { value: 'newest', label: 'Newest' },
  { value: 'xp', label: 'Most XP' },
  { value: 'difficulty', label: 'Easiest first' },
  { value: 'title', label: 'Title A–Z' },
];

/**
 * Search + category/difficulty/status/sort filters for the catalogue.
 * Filters are controlled by the parent page so they can live in the URL.
 */
export function ChallengeFilters({ filters, onChange, facets, onReset }) {
  const categoryOptions = [
    { value: 'all', label: `All categories${facets?.categories?.length ? ` (${facets.categories.reduce((sum, item) => sum + item.total, 0)})` : ''}` },
    ...CATEGORIES.map((category) => {
      const facet = facets?.categories?.find((item) => item.category === category);
      return { value: category, label: facet ? `${category} (${facet.total})` : category };
    }),
  ];

  const difficultyOptions = [
    { value: 'all', label: 'All difficulties' },
    ...DIFFICULTIES.map((difficulty) => {
      const facet = facets?.difficulties?.find((item) => item.difficulty === difficulty);
      return { value: difficulty, label: facet ? `${difficulty} (${facet.total})` : difficulty };
    }),
  ];

  return (
    <div className="card p-4">
      <div className="grid gap-3 lg:grid-cols-[minmax(0,2fr)_repeat(4,minmax(0,1fr))]">
        <SearchField
          value={filters.search}
          onChange={(value) => onChange({ ...filters, search: value, page: 1 })}
          placeholder="Search challenges…"
        />

        <SelectField
          aria-label="Filter by category"
          value={filters.category}
          options={categoryOptions}
          onChange={(event) => onChange({ ...filters, category: event.target.value, page: 1 })}
        />

        <SelectField
          aria-label="Filter by difficulty"
          value={filters.difficulty}
          options={difficultyOptions}
          onChange={(event) => onChange({ ...filters, difficulty: event.target.value, page: 1 })}
        />

        <SelectField
          aria-label="Filter by status"
          value={filters.status}
          options={STATUS_OPTIONS}
          onChange={(event) => onChange({ ...filters, status: event.target.value, page: 1 })}
        />

        <SelectField
          aria-label="Sort challenges"
          value={filters.sort}
          options={SORT_OPTIONS}
          onChange={(event) => onChange({ ...filters, sort: event.target.value, page: 1 })}
        />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-ink-500">
        <span className="inline-flex items-center gap-1.5">
          <ListFilter className="h-3.5 w-3.5" /> {filters.category === 'all' ? 'Every category' : filters.category} ·{' '}
          {filters.difficulty === 'all' ? 'every difficulty' : filters.difficulty}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <LayoutGrid className="h-3.5 w-3.5" /> Sorted by {SORT_OPTIONS.find((option) => option.value === filters.sort)?.label.toLowerCase()}
        </span>
        <button type="button" onClick={onReset} className="text-brand-600 hover:text-brand-700 hover:underline">
          Reset filters
        </button>
      </div>
    </div>
  );
}

export default ChallengeFilters;
