import { useEffect, useState } from 'react';
import { KeyRound, Palette, Save, ShieldCheck, UserRound } from 'lucide-react';
import { AppLayout } from '../components/layout/AppLayout.jsx';
import { PageContainer, PageHeader, Section, Avatar } from '../components/ui/Layout.jsx';
import { SelectField, TextArea, TextField, Toggle } from '../components/ui/Controls.jsx';
import Button from '../components/ui/Button.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';
import userService from '../services/userService.js';
import authService from '../services/authService.js';
import { EDITOR_THEMES } from '../lib/constants.js';

export function Settings() {
  useDocumentTitle('Settings');
  const { user, setUser, isAdmin } = useAuth();
  const toast = useToast();

  const [profile, setProfile] = useState({ name: '', bio: '', avatar: '' });
  const [preferences, setPreferences] = useState({ editorFontSize: 14, editorTheme: 'light', tabSize: 2, autoRun: false });
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPreferences, setSavingPreferences] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!user) return;
    setProfile({ name: user.name ?? '', bio: user.bio ?? '', avatar: user.avatar ?? '' });
    setPreferences({
      editorFontSize: user.preferences?.editorFontSize ?? 14,
      editorTheme: user.preferences?.editorTheme ?? 'light',
      tabSize: user.preferences?.tabSize ?? 2,
      autoRun: user.preferences?.autoRun ?? false,
    });
  }, [user]);

  const saveProfile = async (event) => {
    event.preventDefault();
    if (profile.name.trim().length < 2) {
      setErrors({ name: 'Name must be at least 2 characters.' });
      return;
    }
    setErrors({});
    setSavingProfile(true);
    try {
      const { data } = await userService.update({
        name: profile.name.trim(),
        bio: profile.bio.trim(),
        avatar: profile.avatar.trim(),
      });
      setUser(data?.user ?? { ...user, name: profile.name.trim(), bio: profile.bio.trim() });
      toast.success('Profile updated.');
    } catch (error) {
      if (error.isValidationError && Array.isArray(error.details)) {
        setErrors(Object.fromEntries(error.details.map((detail) => [detail.field, detail.message])));
      }
      toast.error(error.message);
    } finally {
      setSavingProfile(false);
    }
  };

  const savePreferences = async () => {
    setSavingPreferences(true);
    try {
      const { data } = await userService.update({ preferences });
      setUser(data?.user ?? { ...user, preferences });
      toast.success('Editor preferences saved.');
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSavingPreferences(false);
    }
  };

  const changePassword = async (event) => {
    event.preventDefault();
    if (passwords.newPassword !== passwords.confirmPassword) {
      setErrors({ confirmPassword: 'Both passwords must match.' });
      return;
    }
    if (!/^(?=.*[a-zA-Z])(?=.*\d).{8,}$/.test(passwords.newPassword)) {
      setErrors({ newPassword: 'At least 8 characters with a letter and a number.' });
      return;
    }
    setErrors({});
    setSavingPassword(true);
    try {
      await authService.changePassword({
        currentPassword: passwords.currentPassword,
        newPassword: passwords.newPassword,
      });
      setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
      toast.success('Password changed.');
    } catch (error) {
      if (error.isValidationError && Array.isArray(error.details)) {
        setErrors(Object.fromEntries(error.details.map((detail) => [detail.field, detail.message])));
      }
      toast.error(error.message);
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <AppLayout>
      <PageContainer>
        <PageHeader icon={UserRound} title="Settings" description="Your profile, editor preferences and security." />

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
          <div className="space-y-6">
            <Section title="Profile" description="This is what your teammates see on the leaderboard and public profile.">
              <form className="space-y-4" onSubmit={saveProfile} noValidate>
                <div className="flex items-center gap-4">
                  <Avatar user={{ name: profile.name || user?.name, avatar: profile.avatar }} size={64} />
                  <div className="flex-1">
                    <TextField
                      label="Avatar URL"
                      value={profile.avatar}
                      onChange={(event) => setProfile((current) => ({ ...current, avatar: event.target.value }))}
                      placeholder="https://… or leave empty for a generated avatar"
                      hint="Accepts an http(s) image URL or a data:image URI. Leave empty to use your generated avatar."
                    />
                  </div>
                </div>

                <TextField
                  label="Full name"
                  value={profile.name}
                  error={errors.name}
                  onChange={(event) => setProfile((current) => ({ ...current, name: event.target.value }))}
                  required
                />
                <TextArea
                  label="Bio"
                  rows={3}
                  maxLength={280}
                  value={profile.bio}
                  hint={`${profile.bio.length}/280 characters`}
                  onChange={(event) => setProfile((current) => ({ ...current, bio: event.target.value }))}
                  placeholder="Frontend developer, currently obsessed with CSS grid."
                />

                <div className="flex items-center gap-3 border-t border-slate-100 pt-4">
                  <Button type="submit" icon={Save} loading={savingProfile}>
                    Save profile
                  </Button>
                  <Button
                    variant="ghost"
                    type="button"
                    onClick={() => {
                      setProfile({ name: user?.name ?? '', bio: user?.bio ?? '', avatar: user?.avatar ?? '' });
                      setErrors({});
                    }}
                  >
                    Discard changes
                  </Button>
                </div>
              </form>
            </Section>

            <Section title="Password" description="Changing your password keeps your session active.">
              <form className="grid gap-4 sm:grid-cols-3" onSubmit={changePassword} noValidate>
                <TextField
                  label="Current password"
                  type="password"
                  autoComplete="current-password"
                  value={passwords.currentPassword}
                  error={errors.currentPassword}
                  onChange={(event) => setPasswords((current) => ({ ...current, currentPassword: event.target.value }))}
                  required
                />
                <TextField
                  label="New password"
                  type="password"
                  autoComplete="new-password"
                  value={passwords.newPassword}
                  error={errors.newPassword}
                  onChange={(event) => setPasswords((current) => ({ ...current, newPassword: event.target.value }))}
                  required
                />
                <TextField
                  label="Confirm new password"
                  type="password"
                  autoComplete="new-password"
                  value={passwords.confirmPassword}
                  error={errors.confirmPassword}
                  onChange={(event) => setPasswords((current) => ({ ...current, confirmPassword: event.target.value }))}
                  required
                />
                <div className="sm:col-span-3">
                  <Button type="submit" variant="secondary" icon={KeyRound} loading={savingPassword}>
                    Update password
                  </Button>
                </div>
              </form>
            </Section>
          </div>

          <div className="space-y-6">
            <Section title="Editor preferences" description="Applied to the challenge workspace on this account.">
              <div className="space-y-4">
                <SelectField
                  label="Theme"
                  value={preferences.editorTheme}
                  options={EDITOR_THEMES}
                  onChange={(event) => setPreferences((current) => ({ ...current, editorTheme: event.target.value }))}
                />
                <SelectField
                  label="Font size"
                  value={String(preferences.editorFontSize)}
                  options={[12, 13, 14, 15, 16, 18, 20].map((size) => ({ value: String(size), label: `${size}px` }))}
                  onChange={(event) => setPreferences((current) => ({ ...current, editorFontSize: Number(event.target.value) }))}
                />
                <SelectField
                  label="Tab size"
                  value={String(preferences.tabSize)}
                  options={[2, 4, 8].map((size) => ({ value: String(size), label: `${size} spaces` }))}
                  onChange={(event) => setPreferences((current) => ({ ...current, tabSize: Number(event.target.value) }))}
                />
                <Toggle
                  id="auto-run"
                  checked={preferences.autoRun}
                  onChange={(value) => setPreferences((current) => ({ ...current, autoRun: value }))}
                  label="Reload the preview after submitting"
                  description="Keeps the sandbox in sync with the code you just submitted."
                />

                <Button icon={Palette} loading={savingPreferences} onClick={savePreferences}>
                  Save preferences
                </Button>
              </div>
            </Section>

            <Section title="Account">
              <dl className="space-y-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-ink-500">Username</dt>
                  <dd className="font-medium text-ink-800">@{user?.username}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-ink-500">Email</dt>
                  <dd className="truncate font-medium text-ink-800">{user?.email}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-ink-500">Role</dt>
                  <dd className="flex items-center gap-1.5 font-medium text-ink-800">
                    {isAdmin ? <ShieldCheck className="h-4 w-4 text-brand-500" /> : null}
                    {user?.role}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-ink-500">Submissions</dt>
                  <dd className="font-medium text-ink-800">{user?.submissionsCount ?? 0}</dd>
                </div>
              </dl>
              <p className="mt-4 border-t border-slate-100 pt-3 text-xs text-ink-500">
                Usernames and emails are permanent identifiers — contact an admin if they need to change.
              </p>
            </Section>
          </div>
        </div>
      </PageContainer>
    </AppLayout>
  );
}

export default Settings;
