import { useEffect, useState } from 'react';
import { NavLink, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Target, CalendarDays, MessagesSquare, BarChart3, Trophy,
  Users, User, ShieldCheck, LogOut, Menu, X, Bell, Settings, Rocket,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Avatar from '../components/Avatar';
import api from '../services/api';

const NAV = [
  { to: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { to: '/challenges', label: 'Challenges', icon: Target },
  { to: '/events', label: 'Events', icon: CalendarDays },
  { to: '/community', label: 'Community', icon: MessagesSquare },
  { to: '/chat', label: 'Group Chat', icon: MessagesSquare },
  { to: '/polls', label: 'Polls', icon: BarChart3 },
  { to: '/leaderboard', label: 'Leaderboard', icon: Trophy },
  { to: '/members', label: 'Members', icon: Users },
  { to: '/profile', label: 'My Profile', icon: User },
];

/** Desktop sidebar + mobile drawer + topbar. */
export default function DashboardLayout({ children, admin = false }) {
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    let alive = true;
    const load = () =>
      api.get('/notifications/unread-count')
        .then((r) => alive && setUnread(r.data.data.count))
        .catch(() => {});
    load();
    const t = setInterval(load, 60000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [location.pathname]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navItems = (
    <nav className="flex flex-1 flex-col gap-1 px-3">
      {NAV.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
              isActive
                ? 'bg-primary-600 text-white shadow-sm shadow-primary-600/30'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`
          }
        >
          <Icon className="h-[18px] w-[18px]" />
          {label}
        </NavLink>
      ))}
      {isAdmin && (
        <NavLink
          to="/admin"
          className={({ isActive }) =>
            `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
              isActive || admin
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`
          }
        >
          <ShieldCheck className="h-[18px] w-[18px]" />
          Admin Panel
        </NavLink>
      )}
      <button
        type="button"
        onClick={handleLogout}
        className="mt-1 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-rose-50 hover:text-rose-600"
      >
        <LogOut className="h-[18px] w-[18px]" />
        Logout
      </button>
    </nav>
  );

  const brand = (
    <Link to="/dashboard" className="flex items-center gap-2.5 px-5 py-5">
      <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-indigo-600 text-white shadow-sm">
        <Rocket className="h-5 w-5" />
      </span>
      <span className="text-lg font-bold tracking-tight text-slate-900">
        Growth Circle
      </span>
    </Link>
  );

  return (
    <div className="min-h-screen">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-slate-200 bg-white lg:flex">
        {brand}
        {navItems}
        <div className="border-t border-slate-100 p-4">
          <div className="flex items-center gap-3">
            <Avatar user={user} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-800">{user?.name}</p>
              <p className="truncate text-xs text-slate-400">@{user?.username}</p>
            </div>
            <Link to="/settings" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600" title="Account settings">
              <Settings className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/50" onClick={() => setMobileOpen(false)} aria-hidden="true" />
          <aside className="absolute inset-y-0 left-0 flex w-72 flex-col bg-white shadow-pop">
            <div className="flex items-center justify-between pr-3">
              {brand}
              <button type="button" onClick={() => setMobileOpen(false)} aria-label="Close menu" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>
            {navItems}
            <div className="border-t border-slate-100 p-4">
              <div className="flex items-center gap-3">
                <Avatar user={user} size="sm" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-800">{user?.name}</p>
                  <Link to="/settings" className="text-xs text-primary-600">Account settings</Link>
                </div>
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* Main column */}
      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/90 px-4 backdrop-blur sm:px-6">
          <button type="button" onClick={() => setMobileOpen(true)} aria-label="Open menu" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden">
            <Menu className="h-5 w-5" />
          </button>
          <div className="hidden sm:block">
            <p className="text-sm text-slate-400">
              {admin ? 'Administrator console' : 'Team learning, challenges &amp; practice — all in one place'}
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Link
              to="/notifications"
              className="relative rounded-xl p-2.5 text-slate-500 transition hover:bg-slate-100"
              title="Notifications"
            >
              <Bell className="h-5 w-5" />
              {unread > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
                  {unread > 99 ? '99+' : unread}
                </span>
              )}
            </Link>
            <Link to="/profile" className="flex items-center gap-2 rounded-xl p-1.5 pr-3 transition hover:bg-slate-100" title="My profile">
              <Avatar user={user} size="sm" />
              <span className="hidden text-sm font-semibold text-slate-700 sm:block">{user?.name?.split(' ')[0]}</span>
            </Link>
          </div>
        </header>
        <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
