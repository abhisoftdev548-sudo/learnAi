import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { User, Save, Camera, Eye, Plus, X } from 'lucide-react';
import api, { apiError } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Avatar from '../components/Avatar';
import { PageLoader, Spinner } from '../components/Spinner';
import { Field, Input, Textarea, SubmitButton } from '../components/Form';

export default function MyProfile() {
  const { user, setUser } = useAuth();
  const [form, setForm] = useState(null);
  const [skillInput, setSkillInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);

  useEffect(() => {
    if (user) {
      setForm({
        name: user.name || '',
        bio: user.bio || '',
        skills: user.skills || [],
        githubUrl: user.githubUrl || '',
        linkedinUrl: user.linkedinUrl || '',
        email: user.email || '',
      });
    }
  }, [user]);

  if (!form || !user) return <PageLoader label="Loading your profile…" />;

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const addSkill = () => {
    const s = skillInput.trim();
    if (!s) return;
    if (form.skills.length >= 20) return toast.error('Up to 20 skills');
    if (form.skills.some((x) => x.toLowerCase() === s.toLowerCase())) return toast.error('Skill already added');
    setForm({ ...form, skills: [...form.skills, s] });
    setSkillInput('');
  };

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { data } = await api.patch('/users/me', {
        name: form.name,
        bio: form.bio,
        skills: form.skills,
        githubUrl: form.githubUrl,
        linkedinUrl: form.linkedinUrl,
        email: form.email,
      });
      setUser(data.data.user);
      toast.success('Profile saved');
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setBusy(false);
    }
  };

  const uploadPhoto = async (file) => {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) return toast.error('Photo must be 2MB or smaller');
    setPhotoBusy(true);
    try {
      const fd = new FormData();
      fd.append('photo', file);
      const { data } = await api.post('/users/me/photo', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setUser({ ...user, photoUrl: data.data.photoUrl });
      toast.success('Profile photo updated');
    } catch (e) {
      toast.error(apiError(e));
    } finally {
      setPhotoBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 animate-fadeUp">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Profile</h1>
          <p className="mt-1 text-sm text-slate-500">Update how your teammates see you.</p>
        </div>
        <Link to={`/members/${user.username}`} className="btn-secondary !py-2">
          <Eye className="h-4 w-4" /> View public profile
        </Link>
      </div>

      {/* Photo card */}
      <div className="card flex flex-wrap items-center gap-5 p-6">
        <div className="relative">
          <Avatar user={user} size="xl" />
          <label className="absolute -bottom-1 -right-1 cursor-pointer rounded-full bg-primary-600 p-2 text-white shadow-lg transition hover:bg-primary-700" title="Change photo">
            {photoBusy ? <Spinner className="h-4 w-4" /> : <Camera className="h-4 w-4" />}
            <input type="file" accept="image/*" className="hidden" onChange={(e) => uploadPhoto(e.target.files?.[0])} />
          </label>
        </div>
        <div>
          <p className="text-lg font-bold text-slate-900">{user.name}</p>
          <p className="text-sm text-slate-400">@{user.username} · {user.email}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <span className="badge bg-primary-50 text-primary-700 ring-1 ring-inset ring-primary-600/20">{user.points} points</span>
            <span className="badge bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20">{user.completedChallenges} completed</span>
            <span className="badge bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-600/20">{user.eventsAttended} events</span>
          </div>
        </div>
      </div>

      {/* Edit form */}
      <form onSubmit={save} className="card space-y-5 p-6">
        <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
          <User className="h-4 w-4 text-primary-500" /> Profile details
        </h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name" required>
            <Input value={form.name} onChange={set('name')} maxLength={60} />
          </Field>
          <Field label="Email" hint="Used to sign in">
            <Input type="email" value={form.email} onChange={set('email')} />
          </Field>
        </div>

        <Field label="Bio" hint={`${form.bio.length}/200`}>
          <Textarea rows={3} value={form.bio} onChange={set('bio')} maxLength={200} placeholder="What are you learning right now?" />
        </Field>

        <Field label="Skills" hint="Press Enter or click Add">
          <div className="flex gap-2">
            <Input
              value={skillInput}
              onChange={(e) => setSkillInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSkill(); } }}
              placeholder="React, DSA, Figma…"
            />
            <button type="button" className="btn-secondary shrink-0" onClick={addSkill}>
              <Plus className="h-4 w-4" /> Add
            </button>
          </div>
        </Field>
        {form.skills.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {form.skills.map((s) => (
              <span key={s} className="badge bg-primary-50 text-primary-700 ring-1 ring-inset ring-primary-600/20">
                {s}
                <button type="button" onClick={() => setForm({ ...form, skills: form.skills.filter((x) => x !== s) })} aria-label={`Remove ${s}`}>
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="GitHub URL">
            <Input value={form.githubUrl} onChange={set('githubUrl')} placeholder="https://github.com/you" />
          </Field>
          <Field label="LinkedIn URL">
            <Input value={form.linkedinUrl} onChange={set('linkedinUrl')} placeholder="https://linkedin.com/in/you" />
          </Field>
        </div>

        <div className="flex justify-end border-t border-slate-100 pt-4">
          <SubmitButton busy={busy} className="btn-primary">
            <Save className="h-4 w-4" /> Save changes
          </SubmitButton>
        </div>
      </form>
    </div>
  );
}
