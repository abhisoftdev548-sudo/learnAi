import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft, Github, Linkedin, Calendar, Trophy, CheckCircle2, Users,
  MessageSquare, ExternalLink, Pencil,
} from 'lucide-react';
import api, { apiError } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Avatar from '../components/Avatar';
import StatusBadge from '../components/StatusBadge';
import { PageLoader } from '../components/Spinner';
import { formatDate, formatDateTime, truncate, CATEGORY_LABELS } from '../utils/format';

export default function MemberProfile() {
  const { username } = useParams();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    setData(null);
    api.get(`/users/${username}`)
      .then((r) => setData(r.data.data))
      .catch((e) => setError(apiError(e)));
  }, [username]);

  if (error) return <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>;
  if (!data) return <PageLoader label="Loading profile…" />;

  const { profile, recentSubmissions, recentPosts, eventsAttended } = data;
  const isMe = String(profile.id) === String(user?.id);

  return (
    <div className="mx-auto max-w-4xl space-y-6 animate-fadeUp">
      <div className="flex items-center justify-between">
        <Link to="/members" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-primary-600">
          <ArrowLeft className="h-4 w-4" /> Member directory
        </Link>
        {isMe && (
          <Link to="/profile" className="btn-secondary !py-2">
            <Pencil className="h-4 w-4" /> Edit profile
          </Link>
        )}
      </div>

      {/* Header */}
      <div className="card overflow-hidden">
        <div className="h-24 bg-gradient-to-r from-primary-600 via-primary-500 to-indigo-600" />
        <div className="px-6 pb-6">
          <div className="-mt-10 flex flex-wrap items-end justify-between gap-4">
            <div className="flex items-end gap-4">
              <Avatar user={profile} size="xl" className="ring-4" />
              <div className="pb-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-bold text-slate-900">{profile.name}</h1>
                  {profile.role === 'admin' && (
                    <span className="badge bg-slate-900 text-white">Admin</span>
                  )}
                </div>
                <p className="text-sm text-slate-400">@{profile.username}</p>
              </div>
            </div>
          </div>

          {profile.bio && <p className="mt-4 max-w-2xl text-sm leading-relaxed text-slate-600">{profile.bio}</p>}

          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-slate-500">
            <span className="inline-flex items-center gap-1.5"><Calendar className="h-4 w-4 text-slate-400" /> Joined {formatDate(profile.joinedAt)}</span>
            {profile.githubUrl && (
              <a href={profile.githubUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-slate-600 hover:text-primary-600">
                <Github className="h-4 w-4" /> GitHub
              </a>
            )}
            {profile.linkedinUrl && (
              <a href={profile.linkedinUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-slate-600 hover:text-primary-600">
                <Linkedin className="h-4 w-4" /> LinkedIn
              </a>
            )}
          </div>

          {profile.skills?.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {profile.skills.map((s) => (
                <span key={s} className="badge bg-primary-50 text-primary-700 ring-1 ring-inset ring-primary-600/20">{s}</span>
              ))}
            </div>
          )}

          {/* Stats */}
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { icon: Trophy, label: 'Total points', value: profile.points, tone: 'text-amber-500' },
              { icon: CheckCircle2, label: 'Completed', value: profile.completedChallenges, tone: 'text-emerald-500' },
              { icon: Users, label: 'Events attended', value: eventsAttended, tone: 'text-sky-500' },
              { icon: MessageSquare, label: 'Posts', value: recentPosts.length, tone: 'text-violet-500' },
            ].map(({ icon: Icon, label, value, tone }) => (
              <div key={label} className="rounded-xl border border-slate-100 p-3 text-center">
                <Icon className={`mx-auto h-4 w-4 ${tone}`} />
                <p className="mt-1 text-lg font-bold text-slate-900">{value}</p>
                <p className="text-xs text-slate-400">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent submissions */}
        <section className="card p-5">
          <h2 className="text-base font-semibold text-slate-900">Recent public submissions</h2>
          {recentSubmissions.length === 0 ? (
            <p className="mt-3 text-sm text-slate-400">No approved submissions yet.</p>
          ) : (
            <ul className="mt-3 divide-y divide-slate-100">
              {recentSubmissions.map((s) => (
                <li key={s.id} className="flex items-center gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <Link to={`/challenges/${s.challenge?._id || s.challenge}`} className="text-sm font-medium text-slate-800 hover:text-primary-600">
                      {s.challenge?.title || 'Challenge'}
                    </Link>
                    <p className="text-xs text-slate-400">
                      {CATEGORY_LABELS[s.challenge?.category] || ''} · {formatDate(s.submittedAt)}
                    </p>
                  </div>
                  <StatusBadge status={s.status} />
                  {s.score != null && <span className="text-sm font-bold text-emerald-600">{s.score} pts</span>}
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Recent activity */}
        <section className="card p-5">
          <h2 className="text-base font-semibold text-slate-900">Recent activity</h2>
          {recentPosts.length === 0 ? (
            <p className="mt-3 text-sm text-slate-400">No community posts yet.</p>
          ) : (
            <ul className="mt-3 space-y-3">
              {recentPosts.map((p) => (
                <li key={p.id}>
                  <Link to={`/community/${p.id}`} className="block rounded-xl border border-slate-100 p-3 transition hover:border-primary-200 hover:bg-primary-50/30">
                    <p className="text-sm font-semibold text-slate-800">{p.title}</p>
                    <p className="mt-1 text-xs text-slate-500">{truncate(p.body, 120)}</p>
                    <p className="mt-1.5 text-xs text-slate-400">
                      {formatDateTime(p.createdAt)} · ♥ {p.likeCount} · 💬 {p.commentCount}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* Private contact note — email is never exposed on public profiles */}
      <p className="flex items-center justify-center gap-1.5 text-xs text-slate-400">
        <ExternalLink className="h-3.5 w-3.5" /> Contact details are kept private — use the community feed to connect.
      </p>
    </div>
  );
}
