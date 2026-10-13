import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  Award,
  ChevronDown,
  Code2,
  History,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  ShieldCheck,
  Trophy,
  User,
  X,
  Zap,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { Avatar } from '../ui/Layout.jsx';
import { formatNumber } from '../../lib/format.js';

const NAV_LINKS = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/challenges', label: 'Challenges', icon: Code2 },
  { to: '/leaderboard', label: 'Leaderboard', icon: Trophy },
  { to: '/achievements', label: 'Achievements', icon: Award },
  { to: '/history', label: 'History', icon: History },
];

export function Logo({ className = '' }) {
  return (
    <Link to="/" className={`flex items-center gap-2 ${className}`}>
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-violet-500 text-white shadow-sm">
        <Zap className="h-4 w-4" strokeWidth={2.4} />
      </span>
      <span className="text-lg font-semibold tracking-tight text-ink-900">
        Learn<span className="text-brand-600">AI</span>
      </span>
    </Link>
  );
}

export function Navbar() {
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef(null);

  useEffect(() => {
    setMenuOpen(false);
    setUserMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    function onClick(event) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) setUserMenuOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const handleLogout = async () => {
    await logout();
    toast.info('Signed out — see you soon.');
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/85 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-8">
          <Logo />
          {isAuthenticated ? (
            <nav className="hidden items-center gap-1 lg:flex">
              {NAV_LINKS.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  className={({ isActive }) =>
                    `rounded-lg px-3 py-2 text-sm font-medium transition ${
                      isActive ? 'bg-brand-50 text-brand-700' : 'text-ink-600 hover:bg-slate-100 hover:text-ink-900'
                    }`
                  }
                >
                  {link.label}
                </NavLink>
              ))}
              {isAdmin ? (
                <NavLink
                  to="/admin"
                  className={({ isActive }) =>
                    `flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition ${
                      isActive ? 'bg-brand-50 text-brand-700' : 'text-ink-600 hover:bg-slate-100 hover:text-ink-900'
                    }`
                  }
                >
                  <ShieldCheck className="h-4 w-4" /> Admin
                </NavLink>
              ) : null}
            </nav>
          ) : null}
        </div>

        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <>
              <div className="hidden items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-ink-600 sm:flex">
                <Zap className="h-3.5 w-3.5 text-brand-500" />
                {formatNumber(user?.xp ?? 0)} XP
                <span className="text-ink-300">·</span>
                Lv {user?.level ?? 1}
              </div>

              <div className="relative" ref={userMenuRef}>
                <button
                  type="button"
                  onClick={() => setUserMenuOpen((open) => !open)}
                  className="flex items-center gap-2 rounded-full border border-slate-200 bg-white p-1 pr-2 transition hover:border-brand-200 hover:bg-brand-50"
                  aria-expanded={userMenuOpen}
                  aria-haspopup="menu"
                >
                  <Avatar user={user} size={30} />
                  <span className="hidden max-w-[8rem] truncate text-sm font-medium text-ink-700 sm:block">{user?.name}</span>
                  <ChevronDown className="h-3.5 w-3.5 text-ink-400" />
                </button>

                {userMenuOpen ? (
                  <div
                    role="menu"
                    className="absolute right-0 mt-2 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg animate-scale-in"
                  >
                    <div className="border-b border-slate-100 px-3.5 py-2.5">
                      <p className="truncate text-sm font-semibold text-ink-800">{user?.name}</p>
                      <p className="truncate text-xs text-ink-500">@{user?.username}</p>
                    </div>
                    <Link to="/profile" className="flex items-center gap-2 px-3.5 py-2 text-sm text-ink-700 hover:bg-slate-50">
                      <User className="h-4 w-4 text-ink-400" /> Profile
                    </Link>
                    <Link to="/settings" className="flex items-center gap-2 px-3.5 py-2 text-sm text-ink-700 hover:bg-slate-50">
                      <Settings className="h-4 w-4 text-ink-400" /> Settings
                    </Link>
                    {isAdmin ? (
                      <Link to="/admin" className="flex items-center gap-2 px-3.5 py-2 text-sm text-ink-700 hover:bg-slate-50">
                        <ShieldCheck className="h-4 w-4 text-ink-400" /> Admin panel
                      </Link>
                    ) : null}
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="flex w-full items-center gap-2 border-t border-slate-100 px-3.5 py-2 text-left text-sm text-rose-600 hover:bg-rose-50"
                    >
                      <LogOut className="h-4 w-4" /> Sign out
                    </button>
                  </div>
                ) : null}
              </div>

              <button
                type="button"
                className="rounded-lg p-2 text-ink-500 transition hover:bg-slate-100 lg:hidden"
                onClick={() => setMenuOpen((open) => !open)}
                aria-label="Toggle navigation"
              >
                {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Link to="/login" className="btn-ghost btn-sm">
                Sign in
              </Link>
              <Link to="/register" className="btn-primary btn-sm">
                Get started
              </Link>
            </div>
          )}
        </div>
      </div>

      {isAuthenticated && menuOpen ? (
        <nav className="border-t border-slate-200 bg-white px-4 pb-4 pt-2 lg:hidden">
          {[...NAV_LINKS, ...(isAdmin ? [{ to: '/admin', label: 'Admin', icon: ShieldCheck }] : []), { to: '/settings', label: 'Settings', icon: Settings }].map(
            (link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium ${
                    isActive ? 'bg-brand-50 text-brand-700' : 'text-ink-600 hover:bg-slate-50'
                  }`
                }
              >
                <link.icon className="h-4 w-4" />
                {link.label}
              </NavLink>
            ),
          )}
        </nav>
      ) : null}
    </header>
  );
}

export default Navbar;
