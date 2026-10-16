import { Link } from 'react-router-dom';
import {
  Rocket, Target, Users, Trophy, CalendarDays, MessageSquare, ShieldCheck,
  ArrowRight, CheckCircle2, Star,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const FEATURES = [
  { icon: Target, title: 'Real challenges', body: 'Coding, web, AI/ML, design and communication tasks with deadlines, submissions and admin review.' },
  { icon: Trophy, title: 'Points & leaderboard', body: 'Earn points for approved work, climb the ranked leaderboard and track your progress weekly.' },
  { icon: CalendarDays, title: 'Team events', body: 'DSA nights, workshops and project reviews — register, get reminders and track attendance.' },
  { icon: MessageSquare, title: 'Community feed', body: 'Share what you build, comment on teammates’ work and celebrate wins together.' },
  { icon: Users, title: 'Member directory', body: 'Discover teammates, skills and profiles — a private space for the whole team.' },
  { icon: ShieldCheck, title: 'Admin approved', body: 'A private platform: every account is reviewed by an admin before it gets access.' },
];

export default function Landing() {
  const { authStatus, isAdmin } = useAuth();

  const cta =
    authStatus === 'in' ? (
      <Link to={isAdmin ? '/admin' : '/dashboard'} className="btn-primary !px-6 !py-3 !text-base">
        Open dashboard <ArrowRight className="h-5 w-5" />
      </Link>
    ) : authStatus === 'pending' || authStatus === 'rejected' || authStatus === 'suspended' ? (
      <Link to="/pending" className="btn-primary !px-6 !py-3 !text-base">
        View account status <ArrowRight className="h-5 w-5" />
      </Link>
    ) : (
      <>
        <Link to="/register" className="btn-primary !px-6 !py-3 !text-base">
          Request access <ArrowRight className="h-5 w-5" />
        </Link>
        <Link to="/login" className="btn-secondary !px-6 !py-3 !text-base">
          Sign in
        </Link>
      </>
    );

  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <header className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2.5">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-indigo-600 text-white">
            <Rocket className="h-5 w-5" />
          </span>
          <span className="text-lg font-bold tracking-tight text-slate-900">
            Growth Circle
          </span>
        </div>
        <nav className="flex items-center gap-3">
          {authStatus === 'out' && (
            <Link to="/login" className="btn-ghost">Sign in</Link>
          )}
          {authStatus === 'loading' ? null : authStatus === 'out' ? (
            <Link to="/register" className="btn-primary">Request access</Link>
          ) : (
            <Link to="/dashboard" className="btn-primary">Dashboard</Link>
          )}
        </nav>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,rgba(109,63,240,0.12),transparent_55%)]" />
        <div className="mx-auto max-w-7xl px-4 pb-20 pt-16 text-center sm:px-6 lg:px-8">
          <span className="badge bg-primary-50 text-primary-700 ring-1 ring-inset ring-primary-600/20 mx-auto">
            <Star className="h-3 w-3" /> Private team learning platform
          </span>
          <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
            Build skills together,
            <span className="bg-gradient-to-r from-primary-600 to-indigo-500 bg-clip-text text-transparent"> forge your future</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-slate-500">
            Growth Circle combines a private team dashboard, a coding-challenge platform and a
            professional community feed — challenges, events, polls, points and a leaderboard,
            all in one approved-members-only space.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            {cta}
          </div>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-slate-400">
            <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> Admin approval required</span>
            <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> Real scoring & review</span>
            <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> Responsive on every device</span>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-7xl px-4 pb-24 sm:px-6 lg:px-8">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, body }) => (
            <div key={title} className="card p-6 transition hover:-translate-y-0.5 hover:shadow-pop">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
                <Icon className="h-5 w-5" />
              </span>
              <h3 className="mt-4 text-base font-semibold text-slate-900">{title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-500">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA band */}
      <section className="bg-slate-900">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-4 px-4 py-14 text-center sm:px-6 lg:px-8">
          {authStatus === 'in' ? (
            <>
              <h2 className="text-2xl font-bold text-white sm:text-3xl">Keep growing with your team.</h2>
              <p className="max-w-xl text-slate-400">Open your dashboard to continue learning, practicing and sharing progress.</p>
              <Link to={isAdmin ? '/admin' : '/dashboard'} className="btn bg-white !px-6 !py-3 !text-base text-slate-900 hover:bg-slate-100">
                Open dashboard <ArrowRight className="h-5 w-5" />
              </Link>
            </>
          ) : authStatus === 'pending' || authStatus === 'rejected' || authStatus === 'suspended' ? (
            <>
              <h2 className="text-2xl font-bold text-white sm:text-3xl">Check your account status.</h2>
              <p className="max-w-xl text-slate-400">Your registration status and next steps are available here.</p>
              <Link to="/pending" className="btn bg-white !px-6 !py-3 !text-base text-slate-900 hover:bg-slate-100">
                View account status <ArrowRight className="h-5 w-5" />
              </Link>
            </>
          ) : (
            <>
              <h2 className="text-2xl font-bold text-white sm:text-3xl">Ready to join the team?</h2>
              <p className="max-w-xl text-slate-400">Request access — an administrator reviews every registration to keep this space private and focused.</p>
              <Link to="/register" className="btn bg-white !px-6 !py-3 !text-base text-slate-900 hover:bg-slate-100">
                Request access <ArrowRight className="h-5 w-5" />
              </Link>
            </>
          )}
        </div>
      </section>

      <footer className="border-t border-slate-100 bg-slate-50">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-6 text-center text-xs text-slate-500 sm:flex-row sm:px-6 sm:text-left lg:px-8">
          <p>© {new Date().getFullYear()} Growth Circle</p>
          <p>Team learning &amp; practice platform · Built with React, Express &amp; MongoDB</p>
        </div>
      </footer>
    </div>
  );
}
