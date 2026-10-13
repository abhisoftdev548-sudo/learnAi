import { useCallback, useState } from 'react';
import { Search, ShieldCheck, ShieldOff, Users } from 'lucide-react';
import { AppLayout } from '../../components/layout/AppLayout.jsx';
import { PageContainer, PageHeader, Section, Avatar } from '../../components/ui/Layout.jsx';
import { ErrorState, LoadingBlock } from '../../components/ui/Feedback.jsx';
import { FilterChips, SearchField } from '../../components/ui/Controls.jsx';
import Button from '../../components/ui/Button.jsx';
import { AdminTable } from '../../components/admin/AdminTable.jsx';
import { ConfirmDialog } from '../../components/ui/Modal.jsx';
import { useApiResource } from '../../hooks/useApiResource.js';
import { useDebouncedValue } from '../../hooks/useDebouncedValue.js';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';
import { useToast } from '../../context/ToastContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import adminService from '../../services/adminService.js';
import { formatNumber, formatRelativeTime } from '../../lib/format.js';

const ROLE_FILTERS = [
  { value: 'all', label: 'Everyone' },
  { value: 'user', label: 'Members' },
  { value: 'admin', label: 'Admins' },
];

export function ManageUsers() {
  useDocumentTitle('Manage users');
  const toast = useToast();
  const { user: currentUser } = useAuth();
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('all');
  const [page, setPage] = useState(1);
  const [target, setTarget] = useState(null);
  const [updating, setUpdating] = useState(false);

  const debouncedSearch = useDebouncedValue(search, 300);

  const request = useCallback(
    () =>
      adminService.users({
        search: debouncedSearch || undefined,
        role: role === 'all' ? undefined : role,
        page,
        limit: 12,
      }),
    [debouncedSearch, role, page],
  );

  const { data: users, meta, error, loading, refetch } = useApiResource(request, [debouncedSearch, role, page]);

  const toggleRole = async () => {
    if (!target) return;
    setUpdating(true);
    try {
      const nextRole = target.role === 'admin' ? 'user' : 'admin';
      await adminService.updateUser(target.id, { role: nextRole });
      toast.success(`${target.name} is now ${nextRole === 'admin' ? 'an admin' : 'a member'}.`);
      setTarget(null);
      refetch({ silent: true });
    } catch (caught) {
      toast.error(caught.message);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <AppLayout>
      <PageContainer>
        <PageHeader
          icon={Users}
          title="Manage users"
          description="Team roster with practice totals. Promote admins to let them author challenges."
          actions={
            <Button to="/admin" variant="secondary">
              Admin dashboard
            </Button>
          }
        />

        <div className="card flex flex-wrap items-center gap-4 p-4">
          <SearchField value={search} onChange={setSearch} placeholder="Search name, username or email…" className="w-full sm:w-72" />
          <FilterChips options={ROLE_FILTERS} value={role} onChange={(value) => { setRole(value); setPage(1); }} />
          {meta ? <span className="ml-auto text-xs text-ink-500">{meta.total} user(s)</span> : null}
        </div>

        <Section className="mt-6" title="Members">
          {error ? (
            <ErrorState error={error} onRetry={refetch} />
          ) : loading && !users ? (
            <LoadingBlock />
          ) : (
            <AdminTable
              loading={loading}
              rows={users ?? []}
              meta={meta}
              onPage={setPage}
              columns={[
                { key: 'user', label: 'Member' },
                { key: 'role', label: 'Role' },
                { key: 'xp', label: 'XP', align: 'right' },
                { key: 'solved', label: 'Solved', align: 'right' },
                { key: 'avg', label: 'Avg score', align: 'right' },
                { key: 'streak', label: 'Streak', align: 'right' },
                { key: 'active', label: 'Last active' },
                { key: 'actions', label: '', align: 'right' },
              ]}
              renderRow={(member) => (
                <tr key={member.id} className="transition hover:bg-slate-50">
                  <td>
                    <div className="flex items-center gap-3">
                      <Avatar user={member} size={34} />
                      <div className="min-w-0">
                        <p className="truncate font-medium text-ink-800">
                          {member.name}
                          {member.id === currentUser?.id ? <span className="ml-2 chip bg-brand-100 text-brand-700">You</span> : null}
                        </p>
                        <p className="truncate text-xs text-ink-500">{member.email}</p>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span
                      className={`chip ${
                        member.role === 'admin' ? 'border border-brand-100 bg-brand-50 text-brand-700' : 'border border-slate-200 bg-slate-50 text-ink-600'
                      }`}
                    >
                      {member.role === 'admin' ? <ShieldCheck className="h-3.5 w-3.5" /> : null}
                      {member.role}
                    </span>
                  </td>
                  <td className="text-right font-semibold text-ink-800">{formatNumber(member.xp)}</td>
                  <td className="text-right">{member.challengesSolved}</td>
                  <td className="text-right">{member.averageScore || '—'}</td>
                  <td className="text-right">{member.currentStreak}</td>
                  <td className="whitespace-nowrap text-ink-600">{formatRelativeTime(member.lastActiveAt)}</td>
                  <td>
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => setTarget(member)}
                        className="rounded-lg p-2 text-ink-400 transition hover:bg-brand-50 hover:text-brand-600"
                        aria-label={`Change role for ${member.name}`}
                        title={member.role === 'admin' ? 'Demote to member' : 'Promote to admin'}
                      >
                        {member.role === 'admin' ? <ShieldOff className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            />
          )}
        </Section>
      </PageContainer>

      <ConfirmDialog
        open={Boolean(target)}
        onClose={() => setTarget(null)}
        onConfirm={toggleRole}
        loading={updating}
        title={target?.role === 'admin' ? `Demote ${target?.name}?` : `Promote ${target?.name}?`}
        description={
          target?.role === 'admin'
            ? 'They will lose access to the admin area and challenge authoring.'
            : 'Admins can create, edit and delete challenges and view every submission.'
        }
        confirmLabel={target?.role === 'admin' ? 'Demote to member' : 'Make admin'}
      />
    </AppLayout>
  );
}

export default ManageUsers;
