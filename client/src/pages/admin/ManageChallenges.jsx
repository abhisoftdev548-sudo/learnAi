import { useCallback, useState } from 'react';
import { FileCode2, Pencil, Plus, Trash2, Wand2 } from 'lucide-react';
import { AppLayout } from '../../components/layout/AppLayout.jsx';
import { PageContainer, PageHeader, Section } from '../../components/ui/Layout.jsx';
import { CategoryBadge, DifficultyBadge } from '../../components/ui/Badge.jsx';
import { ErrorState, LoadingBlock } from '../../components/ui/Feedback.jsx';
import { ConfirmDialog, Modal } from '../../components/ui/Modal.jsx';
import { FilterChips, SearchField } from '../../components/ui/Controls.jsx';
import Button from '../../components/ui/Button.jsx';
import { AdminTable } from '../../components/admin/AdminTable.jsx';
import { ChallengeForm } from './ChallengeForm.jsx';
import { useApiResource } from '../../hooks/useApiResource.js';
import { useDebouncedValue } from '../../hooks/useDebouncedValue.js';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';
import { useToast } from '../../context/ToastContext.jsx';
import challengeService from '../../services/challengeService.js';
import { CATEGORIES } from '../../lib/constants.js';
import { formatNumber } from '../../lib/format.js';

const STATUS_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'published', label: 'Published' },
  { value: 'draft', label: 'Drafts' },
];

export function ManageChallenges() {
  useDocumentTitle('Manage challenges');
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [category, setCategory] = useState('all');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [forcePrompt, setForcePrompt] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const debouncedSearch = useDebouncedValue(search, 300);

  const request = useCallback(
    () =>
      challengeService.list({
        search: debouncedSearch || undefined,
        category: category === 'all' ? undefined : category,
        status: status === 'all' ? undefined : status,
        sort: 'newest',
        limit: 100,
        includeUnpublished: true,
      }),
    [debouncedSearch, category, status],
  );

  const { data: challenges, meta, error, loading, refetch } = useApiResource(request, [debouncedSearch, category, status]);

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = async (challenge) => {
    setLoadingDetail(true);
    try {
      const { data } = await challengeService.get(challenge.slug ?? challenge.id);
      setEditing(data);
      setFormOpen(true);
    } catch (caught) {
      toast.error(caught.message);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleSubmit = async (payload) => {
    setSubmitting(true);
    try {
      if (editing) {
        await challengeService.update(editing.id, payload);
        toast.success(`“${payload.title}” updated.`);
      } else {
        await challengeService.create(payload);
        toast.success(`“${payload.title}” created.`);
      }
      setFormOpen(false);
      setEditing(null);
      refetch({ silent: true });
    } catch (caught) {
      const detail = Array.isArray(caught.details) && caught.details.length ? ` (${caught.details[0].message ?? caught.details[0].field})` : '';
      toast.error(`${caught.message}${detail}`);
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = async (force = false) => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const { data } = await challengeService.remove(deleteTarget.id, { force });
      toast.success(
        `“${deleteTarget.title}” deleted${data?.removedSubmissions ? ` · ${data.removedSubmissions} submission(s) removed, ${data.affectedUsers} member(s) recalculated` : ''}.`,
      );
      setDeleteTarget(null);
      setForcePrompt(null);
      refetch({ silent: true });
    } catch (caught) {
      if (caught.code === 'CHALLENGE_HAS_SUBMISSIONS') {
        // Second, explicit confirmation: deleting will rewind the awarded XP.
        setForcePrompt({ challenge: deleteTarget, count: caught.details?.submissions ?? 0 });
      } else {
        toast.error(caught.message);
      }
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AppLayout>
      <PageContainer>
        <PageHeader
          icon={FileCode2}
          title="Manage challenges"
          description="Author the catalogue: instructions, starter code, hints, attempts and the automated checks."
          actions={
            <>
              <Button variant="secondary" to="/admin" icon={Wand2}>
                Admin dashboard
              </Button>
              <Button icon={Plus} onClick={openCreate}>
                New challenge
              </Button>
            </>
          }
        />

        <div className="card flex flex-wrap items-center gap-4 p-4">
          <SearchField value={search} onChange={setSearch} placeholder="Search by title…" className="w-full sm:w-64" />
          <FilterChips options={STATUS_FILTERS} value={status} onChange={setStatus} />
          <div className="ml-auto">
            <FilterChips
              options={[{ value: 'all', label: 'All categories' }, ...CATEGORIES.map((entry) => ({ value: entry, label: entry }))]}
              value={category}
              onChange={setCategory}
            />
          </div>
        </div>

        <Section className="mt-6" title={meta ? `${meta.total} challenge${meta.total === 1 ? '' : 's'}` : 'Challenges'}>
          {error ? (
            <ErrorState error={error} onRetry={refetch} />
          ) : loading && !challenges ? (
            <LoadingBlock />
          ) : (
            <AdminTable
              loading={loading}
              rows={challenges ?? []}
              columns={[
                { key: 'title', label: 'Challenge' },
                { key: 'category', label: 'Category' },
                { key: 'difficulty', label: 'Difficulty' },
                { key: 'xp', label: 'XP', align: 'right' },
                { key: 'tests', label: 'Checks', align: 'right' },
                { key: 'state', label: 'State' },
                { key: 'actions', label: '', align: 'right' },
              ]}
              renderRow={(challenge) => (
                <tr key={challenge.id} className="transition hover:bg-slate-50">
                  <td>
                    <p className="font-medium text-ink-800">{challenge.title}</p>
                    <p className="truncate text-xs text-ink-500">{challenge.slug}</p>
                  </td>
                  <td>
                    <CategoryBadge category={challenge.category} />
                  </td>
                  <td>
                    <DifficultyBadge difficulty={challenge.difficulty} />
                  </td>
                  <td className="text-right">{formatNumber(challenge.xp)}</td>
                  <td className="text-right">{challenge.testCount ?? 0}</td>
                  <td>
                    <span
                      className={`chip ${
                        challenge.isPublished ? 'border border-emerald-100 bg-emerald-50 text-emerald-700' : 'border border-amber-100 bg-amber-50 text-amber-700'
                      }`}
                    >
                      {challenge.isPublished ? 'Published' : 'Draft'}
                    </span>
                  </td>
                  <td>
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => openEdit(challenge)}
                        className="rounded-lg p-2 text-ink-400 transition hover:bg-brand-50 hover:text-brand-600"
                        aria-label={`Edit ${challenge.title}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(challenge)}
                        className="rounded-lg p-2 text-ink-400 transition hover:bg-rose-50 hover:text-rose-600"
                        aria-label={`Delete ${challenge.title}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            />
          )}
        </Section>
      </PageContainer>

      <Modal
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        title={editing ? `Edit “${editing.title}”` : 'New challenge'}
        description="Members never see these checks — only their results."
        size="xl"
      >
        {loadingDetail ? (
          <LoadingBlock label="Loading challenge…" />
        ) : (
          <ChallengeForm
            initialChallenge={editing}
            submitting={submitting}
            submitLabel={editing ? 'Save changes' : 'Create challenge'}
            onCancel={() => {
              setFormOpen(false);
              setEditing(null);
            }}
            onSubmit={handleSubmit}
          />
        )}
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget) && !forcePrompt}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => confirmDelete(false)}
        loading={deleting}
        title={`Delete “${deleteTarget?.title}”?`}
        description="Members will lose access to this challenge immediately."
        confirmLabel="Delete challenge"
      />

      <Modal
        open={Boolean(forcePrompt)}
        onClose={() => {
          setForcePrompt(null);
          setDeleteTarget(null);
        }}
        title="This challenge has submissions"
        description={`“${forcePrompt?.challenge?.title}” has ${forcePrompt?.count ?? 0} recorded submission(s).`}
        size="sm"
        footer={
          <>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                setForcePrompt(null);
                setDeleteTarget(null);
              }}
            >
              Keep the challenge
            </button>
            <button type="button" className="btn-danger" onClick={() => confirmDelete(true)} disabled={deleting}>
              {deleting ? 'Working…' : 'Delete and rewind XP'}
            </button>
          </>
        }
      >
        <p className="text-sm text-ink-600">
          Deleting the challenge also deletes those submissions and subtracts the XP they granted (achievements already earned stay
          unlocked). Prefer unpublishing it instead if you want to keep the history.
        </p>
      </Modal>
    </AppLayout>
  );
}

export default ManageChallenges;
