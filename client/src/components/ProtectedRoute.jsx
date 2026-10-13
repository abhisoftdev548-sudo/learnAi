import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { PageLoader } from './Spinner';

/**
 * Route guard.
 *  - `approvedOnly` (default): requires a fully approved session
 *  - otherwise: any authenticated session (pending users can see /pending)
 * Unauthenticated visitors are sent to /login (state carries the next path).
 */
export default function ProtectedRoute({ children, approvedOnly = true, adminOnly = false }) {
  const { authStatus, isAdmin } = useAuth();
  const location = useLocation();

  if (authStatus === 'loading') return <PageLoader label="Checking your session…" />;

  if (authStatus === 'out') {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (approvedOnly && authStatus !== 'in') {
    // pending / rejected / suspended -> dedicated status page
    return <Navigate to="/pending" replace />;
  }

  if (adminOnly && !isAdmin) return <Navigate to="/dashboard" replace />;

  return children;
}
