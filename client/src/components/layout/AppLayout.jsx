import { Link } from 'react-router-dom';
import { Github, Zap } from 'lucide-react';
import Navbar from './Navbar.jsx';
import { useAuth } from '../../context/AuthContext.jsx';

export function Footer() {
  const { isAuthenticated } = useAuth();
  return (
    <footer className="mt-auto border-t border-slate-200 bg-white">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-10 sm:px-6 lg:flex-row lg:items-start lg:justify-between lg:px-8">
        <div className="max-w-sm">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-violet-500 text-white">
              <Zap className="h-4 w-4" strokeWidth={2.4} />
            </span>
            <span className="text-base font-semibold text-ink-900">
              Learn<span className="text-brand-600">AI</span>
            </span>
          </div>
          <p className="mt-3 text-sm text-ink-500">
            Practice HTML, CSS and JavaScript through real coding challenges, track your progress, and compete with your team.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">Practice</p>
            <ul className="mt-3 space-y-2 text-sm text-ink-600">
              <li>
                <Link to="/challenges" className="hover:text-brand-600">
                  All challenges
                </Link>
              </li>
              <li>
                <Link to="/challenges?category=HTML" className="hover:text-brand-600">
                  HTML
                </Link>
              </li>
              <li>
                <Link to="/challenges?category=CSS" className="hover:text-brand-600">
                  CSS
                </Link>
              </li>
              <li>
                <Link to="/challenges?category=JavaScript" className="hover:text-brand-600">
                  JavaScript
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">Team</p>
            <ul className="mt-3 space-y-2 text-sm text-ink-600">
              <li>
                <Link to="/leaderboard" className="hover:text-brand-600">
                  Leaderboard
                </Link>
              </li>
              <li>
                <Link to="/achievements" className="hover:text-brand-600">
                  Achievements
                </Link>
              </li>
              <li>
                <Link to={isAuthenticated ? '/dashboard' : '/login'} className="hover:text-brand-600">
                  Dashboard
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">Account</p>
            <ul className="mt-3 space-y-2 text-sm text-ink-600">
              <li>
                <Link to="/login" className="hover:text-brand-600">
                  Sign in
                </Link>
              </li>
              <li>
                <Link to="/register" className="hover:text-brand-600">
                  Create account
                </Link>
              </li>
              <li>
                <a href="https://developer.mozilla.org/docs/Web" className="inline-flex items-center gap-1.5 hover:text-brand-600" target="_blank" rel="noreferrer">
                  <Github className="h-3.5 w-3.5" /> Web docs
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>
      <div className="border-t border-slate-100 py-4">
        <p className="text-center text-xs text-ink-400">© {new Date().getFullYear()} LearnAI · Built for team practice</p>
      </div>
    </footer>
  );
}

/** Shell for every authenticated page (and public marketing pages). */
export function AppLayout({ children }) {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}

export default AppLayout;
