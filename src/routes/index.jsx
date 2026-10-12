import { lazy, Suspense } from "react";
import {
  createBrowserRouter,
  Navigate,
  Outlet,
  useLocation,
  Link,
} from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ErrorState, LoadingScreen, Logo } from "../components/UI";
import AppLayout from "../layouts/AppLayout";
import AuthPage from "../pages/AuthPage";
const Dashboard = lazy(() => import("../pages/Dashboard"));
const Challenges = lazy(() => import("../pages/Challenges"));
const Workspace = lazy(() => import("../pages/Workspace"));
const Profile = lazy(() => import("../pages/Profile"));
const Leaderboard = lazy(() => import("../pages/Leaderboard"));
const Achievements = lazy(() => import("../pages/Achievements"));
const History = lazy(() => import("../pages/History"));
const SubmissionDetail = lazy(() =>
  import("../pages/History").then((m) => ({ default: m.SubmissionDetail })),
);
const Settings = lazy(() => import("../pages/Settings"));
const AdminOverview = lazy(() => import("../pages/admin/AdminOverview"));
const AdminChallenges = lazy(() => import("../pages/admin/AdminChallenges"));
const AdminUsers = lazy(() => import("../pages/admin/AdminUsers"));
const AdminSubmissions = lazy(() => import("../pages/admin/AdminSubmissions"));
const ChallengeForm = lazy(() => import("../pages/admin/ChallengeForm"));
function AuthGuard() {
  const { user, loading, error, refresh } = useAuth();
  const location = useLocation();
  if (loading) return <LoadingScreen />;
  if (!user)
    return (
      <Navigate
        to="/login"
        state={{ from: location.pathname + location.search }}
        replace
      />
    );
  return <Outlet />;
}
function AdminGuard() {
  const { user } = useAuth();
  return user?.role === "admin" ? <Outlet /> : <Navigate to="/" replace />;
}
function RouteBoundary() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <Outlet />
    </Suspense>
  );
}
function NotFound() {
  return (
    <div className="not-found">
      <Logo />
      <span>404</span>
      <h1>A little off the beaten path.</h1>
      <p>This page doesn’t exist. Let’s get you back to building.</p>
      <Link className="btn btn-primary" to="/">
        Back to your workspace
      </Link>
    </div>
  );
}
function RouteError() {
  return (
    <div className="not-found">
      <Logo />
      <ErrorState
        error={{
          message: "This page ran into a problem. Reload to try again.",
        }}
        retry={() => window.location.reload()}
      />
      <Link className="text-link" to="/">
        Return to dashboard
      </Link>
    </div>
  );
}
export const router = createBrowserRouter([
  {
    element: <RouteBoundary />,
    errorElement: <RouteError />,
    children: [
      { path: "/login", element: <AuthPage key="login" /> },
      { path: "/register", element: <AuthPage key="register" register /> },
      {
        element: <AuthGuard />,
        children: [
          {
            element: <AppLayout />,
            children: [
              { index: true, element: <Dashboard /> },
              { path: "/challenges", element: <Challenges /> },
              { path: "/challenges/:id", element: <Workspace /> },
              { path: "/profile", element: <Profile /> },
              { path: "/profile/:username", element: <Profile /> },
              { path: "/leaderboard", element: <Leaderboard /> },
              { path: "/achievements", element: <Achievements /> },
              { path: "/history", element: <History /> },
              { path: "/history/:id", element: <SubmissionDetail /> },
              { path: "/settings", element: <Settings /> },
              {
                element: <AdminGuard />,
                children: [
                  { path: "/admin", element: <AdminOverview /> },
                  {
                    path: "/admin/statistics",
                    element: <AdminOverview statistics />,
                  },
                  { path: "/admin/challenges", element: <AdminChallenges /> },
                  { path: "/admin/challenges/new", element: <ChallengeForm /> },
                  {
                    path: "/admin/challenges/:id/edit",
                    element: <ChallengeForm />,
                  },
                  { path: "/admin/users", element: <AdminUsers /> },
                  { path: "/admin/submissions", element: <AdminSubmissions /> },
                ],
              },
            ],
          },
        ],
      },
      { path: "*", element: <NotFound /> },
    ],
  },
]);
