import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, UserCheck, Users, Target, Inbox, CalendarDays, BarChart3, ShieldAlert,
} from 'lucide-react';

const TABS = [
  { to: '/admin', end: true, label: 'Overview', icon: LayoutDashboard },
  { to: '/admin/approvals', label: 'Approvals', icon: UserCheck },
  { to: '/admin/members', label: 'Members', icon: Users },
  { to: '/admin/challenges', label: 'Challenges', icon: Target },
  { to: '/admin/submissions', label: 'Submissions', icon: Inbox },
  { to: '/admin/events', label: 'Events', icon: CalendarDays },
  { to: '/admin/polls', label: 'Polls', icon: BarChart3 },
  { to: '/admin/moderation', label: 'Moderation', icon: ShieldAlert },
];

/** Horizontal tab bar shared by all admin screens. */
export default function AdminNav() {
  return (
    <nav className="-mx-1 flex gap-1 overflow-x-auto pb-1" aria-label="Admin sections">
      {TABS.map(({ to, end, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            `inline-flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold transition ${
              isActive ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`
          }
        >
          <Icon className="h-4 w-4" />
          {label}
        </NavLink>
      ))}
    </nav>
  );
}
