import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Save, ShieldCheck, LogOut, UserRound } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { useResource } from "../hooks/useResource";
import { userService } from "../services/userService";
import {
  Avatar,
  Button,
  Field,
  PageHeader,
  SectionHeading,
  Skeleton,
  ErrorState,
  Modal,
} from "../components/UI";
export default function Settings() {
  const resource = useResource((signal) => userService.me(signal));
  if (resource.loading) return <Skeleton rows={4} />;
  if (resource.error)
    return <ErrorState error={resource.error} retry={resource.reload} />;
  return <SettingsForm user={resource.data} />;
}
function SettingsForm({ user }) {
  const [form, setForm] = useState({
    name: user.name,
    bio: user.bio || "",
    avatar: user.avatar || "",
  });
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [confirm, setConfirm] = useState(false),
    [signingOut, setSigningOut] = useState(false);
  const auth = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const field = (key) => (e) =>
    setForm((old) => ({ ...old, [key]: e.target.value }));
  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const data = await userService.update({
        ...form,
        name: form.name.trim(),
      });
      auth.setUser(data);
      toast("Your profile is looking good. Changes saved.");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  async function signOut() {
    setSigningOut(true);
    try {
      await auth.logout();
      navigate("/login");
      toast("Signed out of all sessions.");
    } catch (err) {
      toast(err.message, "error");
    } finally {
      setSigningOut(false);
    }
  }
  return (
    <>
      <PageHeader
        title="Make yourself at home."
        description="Your profile, your preferences, your workspace."
      />
      <div className="settings-layout">
        <aside className="settings-nav">
          <a href="#profile-settings" className="active">
            <UserRound size={17} />
            Public profile
          </a>
          <a href="#security-settings">
            <ShieldCheck size={17} />
            Account & security
          </a>
        </aside>
        <div>
          <form
            className="panel settings-panel"
            id="profile-settings"
            onSubmit={save}
          >
            <SectionHeading
              title="Public profile"
              description="A little introduction to the person behind the code."
            />
            <div className="settings-avatar">
              <Avatar user={{ ...user, ...form }} size="large" />
              <div>
                <strong>Your profile picture</strong>
                <p>Use a publicly accessible HTTPS image URL.</p>
              </div>
            </div>
            <Field label="Avatar URL (optional)">
              <input
                type="url"
                pattern="https://.*"
                maxLength={2048}
                placeholder="https://example.com/avatar.jpg"
                value={form.avatar}
                onChange={field("avatar")}
              />
            </Field>
            <div className="form-grid">
              <Field label="Full name">
                <input
                  required
                  maxLength={80}
                  value={form.name}
                  onChange={field("name")}
                />
              </Field>
              <Field label="Username" hint="Your username cannot be changed.">
                <input disabled value={`@${user.username}`} />
              </Field>
            </div>
            <Field label="Bio" hint={`${form.bio.length} / 500 characters`}>
              <textarea
                rows={4}
                maxLength={500}
                placeholder="What are you learning? What do you love building?"
                value={form.bio}
                onChange={field("bio")}
              />
            </Field>
            {error && (
              <div className="inline-error" role="alert">
                {error}
              </div>
            )}
            <div className="settings-save">
              <span>
                Your name, bio, and avatar are visible to other members.
              </span>
              <Button loading={busy} type="submit">
                <Save size={15} />
                Save changes
              </Button>
            </div>
          </form>
          <section className="panel settings-panel" id="security-settings">
            <SectionHeading
              title="Account & security"
              description="A few things that keep your workspace yours."
            />
            <Field label="Email address">
              <input disabled value={user.email || ""} />
            </Field>
            <div className="info-note">
              <ShieldCheck size={21} />
              <p>
                Your session uses a secure HTTP-only cookie. Email and password
                changes aren’t supported by the current API. Contact your
                administrator for account assistance.
              </p>
            </div>
            <div className="security-logout">
              <div>
                <h3>Sign out everywhere</h3>
                <p>Revoke all active sessions on your account.</p>
              </div>
              <Button variant="secondary" onClick={() => setConfirm(true)}>
                <LogOut size={15} />
                Sign out
              </Button>
            </div>
          </section>
        </div>
      </div>
      <Modal
        open={confirm}
        onClose={() => setConfirm(false)}
        title="Sign out of all sessions?"
      >
        <p className="modal-copy">
          You’ll need to sign in again on this device and any other device using
          your account.
        </p>
        <div className="modal-actions">
          <Button
            variant="secondary"
            disabled={signingOut}
            onClick={() => setConfirm(false)}
          >
            Stay here
          </Button>
          <Button loading={signingOut} onClick={signOut}>
            Sign out everywhere
          </Button>
        </div>
      </Modal>
    </>
  );
}
