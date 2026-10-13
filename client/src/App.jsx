import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import { ToastProvider } from './context/ToastContext.jsx';
import { AdminRoute, ProtectedRoute } from './components/layout/Routes.jsx';
import { ErrorBoundary } from './components/ui/ErrorBoundary.jsx';

import Landing from './pages/Landing.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Challenges from './pages/Challenges.jsx';
import Workspace from './pages/Workspace.jsx';
import SubmissionDetail from './pages/SubmissionDetail.jsx';
import Leaderboard from './pages/Leaderboard.jsx';
import Profile from './pages/Profile.jsx';
import Achievements from './pages/Achievements.jsx';
import History from './pages/History.jsx';
import Settings from './pages/Settings.jsx';
import NotFound from './pages/NotFound.jsx';

import AdminDashboard from './pages/admin/AdminDashboard.jsx';
import ManageChallenges from './pages/admin/ManageChallenges.jsx';
import ManageUsers from './pages/admin/ManageUsers.jsx';
import AdminSubmissions from './pages/admin/AdminSubmissions.jsx';
import Statistics from './pages/admin/Statistics.jsx';

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <ErrorBoundary>
          <Routes>
            {/* Public */}
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/leaderboard" element={<Leaderboard />} />

            {/* Members */}
            <Route element={<ProtectedRoute />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/challenges" element={<Challenges />} />
              <Route path="/challenges/:slug" element={<Workspace />} />
              <Route path="/submissions/:id" element={<SubmissionDetail />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/achievements" element={<Achievements />} />
              <Route path="/history" element={<History />} />
              <Route path="/settings" element={<Settings />} />
            </Route>

            {/* Admins */}
            <Route path="/admin" element={<AdminRoute />}>
              <Route index element={<AdminDashboard />} />
              <Route path="challenges" element={<ManageChallenges />} />
              <Route path="users" element={<ManageUsers />} />
              <Route path="submissions" element={<AdminSubmissions />} />
              <Route path="statistics" element={<Statistics />} />
            </Route>

            {/* Aliases */}
            <Route path="/challenge" element={<Navigate to="/challenges" replace />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </ErrorBoundary>
      </ToastProvider>
    </AuthProvider>
  );
}
