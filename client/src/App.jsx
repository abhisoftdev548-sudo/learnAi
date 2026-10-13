import { Routes, Route } from 'react-router-dom';

import Landing from './pages/Landing';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import Pending from './pages/auth/Pending';
import NotFound from './pages/NotFound';
import AppLayout from './layouts/AppLayout';
import ProtectedRoute from './components/ProtectedRoute';

import Dashboard from './pages/Dashboard';
import Challenges from './pages/Challenges';
import ChallengeDetail from './pages/ChallengeDetail';
import Events from './pages/Events';
import EventDetail from './pages/EventDetail';
import Community from './pages/Community';
import PostDetail from './pages/PostDetail';
import Polls from './pages/Polls';
import PollDetail from './pages/PollDetail';
import Leaderboard from './pages/Leaderboard';
import Members from './pages/Members';
import MemberProfile from './pages/MemberProfile';
import MyProfile from './pages/MyProfile';
import Notifications from './pages/Notifications';
import Settings from './pages/Settings';

import AdminOverview from './pages/admin/AdminOverview';
import AdminApprovals from './pages/admin/AdminApprovals';
import AdminMembers from './pages/admin/AdminMembers';
import AdminChallenges from './pages/admin/AdminChallenges';
import AdminChallengeForm from './pages/admin/AdminChallengeForm';
import AdminParticipation from './pages/admin/AdminParticipation';
import AdminSubmissions from './pages/admin/AdminSubmissions';
import AdminSubmissionReview from './pages/admin/AdminSubmissionReview';
import AdminEvents from './pages/admin/AdminEvents';
import AdminEventForm from './pages/admin/AdminEventForm';
import AdminPolls from './pages/admin/AdminPolls';
import AdminPollForm from './pages/admin/AdminPollForm';
import AdminModeration from './pages/admin/AdminModeration';

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route
        path="/pending"
        element={
          <ProtectedRoute approvedOnly={false}>
            <Pending />
          </ProtectedRoute>
        }
      />

      {/* Member app */}
      <Route element={<AppLayout />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/challenges" element={<Challenges />} />
        <Route path="/challenges/:id" element={<ChallengeDetail />} />
        <Route path="/events" element={<Events />} />
        <Route path="/events/:id" element={<EventDetail />} />
        <Route path="/community" element={<Community />} />
        <Route path="/community/:id" element={<PostDetail />} />
        <Route path="/polls" element={<Polls />} />
        <Route path="/polls/:id" element={<PollDetail />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route path="/members" element={<Members />} />
        <Route path="/members/:username" element={<MemberProfile />} />
        <Route path="/profile" element={<MyProfile />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/settings" element={<Settings />} />
      </Route>

      {/* Admin app */}
      <Route path="/admin" element={<AppLayout admin />}>
        <Route index element={<AdminOverview />} />
        <Route path="approvals" element={<AdminApprovals />} />
        <Route path="members" element={<AdminMembers />} />
        <Route path="challenges" element={<AdminChallenges />} />
        <Route path="challenges/new" element={<AdminChallengeForm />} />
        <Route path="challenges/:id/edit" element={<AdminChallengeForm />} />
        <Route path="challenges/:id/participation" element={<AdminParticipation />} />
        <Route path="submissions" element={<AdminSubmissions />} />
        <Route path="submissions/:id" element={<AdminSubmissionReview />} />
        <Route path="events" element={<AdminEvents />} />
        <Route path="events/new" element={<AdminEventForm />} />
        <Route path="events/:id/edit" element={<AdminEventForm />} />
        <Route path="polls" element={<AdminPolls />} />
        <Route path="polls/new" element={<AdminPollForm />} />
        <Route path="polls/:id/edit" element={<AdminPollForm />} />
        <Route path="moderation" element={<AdminModeration />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
