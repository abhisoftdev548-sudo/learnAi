import { Outlet } from 'react-router-dom';
import DashboardLayout from './DashboardLayout';
import ProtectedRoute from '../components/ProtectedRoute';

/** Wraps nested routes in the dashboard chrome + auth guard. */
export default function AppLayout({ admin = false }) {
  return (
    <ProtectedRoute adminOnly={admin}>
      <DashboardLayout admin={admin}>
        <Outlet />
      </DashboardLayout>
    </ProtectedRoute>
  );
}
