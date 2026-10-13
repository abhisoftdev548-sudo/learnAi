import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { LoadingBlock } from '../ui/Feedback.jsx';
import { AppLayout } from './AppLayout.jsx';
import { PageContainer, PageHeader } from '../ui/Layout.jsx';
import Button from '../ui/Button.jsx';

/** Blocks anonymous visitors and remembers where they were heading. */
export function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <AppLayout>
        <PageContainer>
          <LoadingBlock label="Checking your session…" />
        </PageContainer>
      </AppLayout>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }

  return children ?? <Outlet />;
}

/** Admin-only area — non-admins get a clear, non-scary explanation. */
export function AdminRoute({ children }) {
  const { isAuthenticated, isAdmin, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <AppLayout>
        <PageContainer>
          <LoadingBlock label="Checking your permissions…" />
        </PageContainer>
      </AppLayout>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }

  if (!isAdmin) {
    return (
      <AppLayout>
        <PageContainer>
          <PageHeader
            icon={ShieldAlert}
            title="Admins only"
            description="Your account does not have access to the admin area. Ask a team admin if you need authoring rights."
            actions={<Button to="/dashboard" variant="secondary">Back to dashboard</Button>}
          />
        </PageContainer>
      </AppLayout>
    );
  }

  return children ?? <Outlet />;
}

export default ProtectedRoute;
