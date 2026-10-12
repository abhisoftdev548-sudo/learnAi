import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  Code2,
  Eye,
  EyeOff,
  LockKeyhole,
  Sparkles,
  AlertCircle,
  Terminal,
} from "lucide-react";
import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { Button, Field, Logo, LoadingScreen } from "../components/UI";
export default function AuthPage({ register = false }) {
  const auth = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const toast = useToast();
  const [values, setValues] = useState({
    name: "",
    username: "",
    email: "",
    password: "",
    confirm: "",
  });
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [show, setShow] = useState(false);
  const update = (key) => (e) =>
    setValues((v) => ({ ...v, [key]: e.target.value }));
  if (auth.loading) return <LoadingScreen />;
  if (auth.user) return <Navigate to={location.state?.from || "/"} replace />;
  async function submit(e) {
    e.preventDefault();
    setError("");
    if (register && values.password !== values.confirm)
      return setError(
        "Your passwords don’t match. Please check and try again.",
      );
    if (new TextEncoder().encode(values.password).length > 72)
      return setError("Please keep your password within 72 UTF-8 bytes.");
    setBusy(true);
    try {
      const body = register
        ? {
            name: values.name.trim(),
            username: values.username.trim().toLowerCase(),
            email: values.email.trim(),
            password: values.password,
          }
        : { email: values.email.trim(), password: values.password };
      await (register ? auth.register(body) : auth.login(body));
      toast(
        register
          ? "Your developer journey starts here. Welcome aboard!"
          : "Welcome back. Let’s build something.",
      );
      navigate(location.state?.from || "/", { replace: true });
    } catch (err) {
      setError(
        err.status === 409
          ? "That username or email is already in use. Try another, or sign in to your account."
          : err.message,
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="auth-page">
      <section className="auth-story">
        <div className="auth-story-content">
          <Logo />
          <div className="auth-story-main">
            <span className="auth-pill">
              <span />A little practice. A better developer.
            </span>
            <h1>
              Great code starts
              <br />
              with <span>small steps.</span>
            </h1>
            <p>
              A focused space to sharpen your frontend skills,
              <br className="desktop-break" /> challenge yourself, and grow with
              your team.
            </p>
            <div
              className="auth-illustration"
              aria-label="Illustration of a coding workspace"
            >
              <div className="illustration-window">
                <div className="window-title">
                  <div className="window-dots">
                    <i />
                    <i />
                    <i />
                  </div>
                  <span>your-next-breakthrough.js</span>
                  <Code2 size={15} />
                </div>
                <div className="illustration-code">
                  <div>
                    <em>01</em>
                    <span className="syntax-purple">const</span> developer ={" "}
                    {"{"}
                  </div>
                  <div>
                    <em>02</em> curiosity:{" "}
                    <span className="syntax-orange">'always'</span>,
                  </div>
                  <div>
                    <em>03</em> progress:{" "}
                    <span className="syntax-orange">'one day at a time'</span>,
                  </div>
                  <div>
                    <em>04</em> possibilities:{" "}
                    <span className="syntax-purple">Infinity</span>
                  </div>
                  <div>
                    <em>05</em>
                    {"}"};
                  </div>
                  <div>
                    <em>06</em>
                  </div>
                  <div>
                    <em>07</em>
                    <span className="syntax-green">
                      // Your next chapter starts here.
                    </span>
                  </div>
                  <div>
                    <em>08</em>developer.
                    <span className="syntax-blue">keepBuilding</span>();
                    <span className="code-cursor" />
                  </div>
                </div>
                <div className="window-status">
                  <span>
                    <span />
                    Ready to create
                  </span>
                  <span>JavaScript · UTF-8</span>
                </div>
              </div>
              <div className="floating-token html-token">
                <Code2 size={18} />
                <span>HTML</span>
              </div>
              <div className="floating-token css-token">
                <span className="token-hash">#</span>
                <span>CSS</span>
              </div>
              <div className="illustration-check">
                <span>
                  <Check size={17} />
                </span>
                <div>
                  <strong>Progress over perfection.</strong>
                  <small>That’s how better developers are built.</small>
                </div>
                <Sparkles size={17} />
              </div>
            </div>
            <div className="auth-benefits">
              <span>
                <Check size={15} />
                Hands-on challenges
              </span>
              <span>
                <Check size={15} />
                Real progress
              </span>
              <span>
                <Check size={15} />
                Better together
              </span>
            </div>
          </div>
          <div className="auth-story-footer">
            <span>Built for the joy of building.</span>
            <span>
              HTML <i /> CSS <i /> JavaScript
            </span>
          </div>
        </div>
      </section>
      <section className="auth-form-side">
        <div className="auth-switch">
          {register ? "Already part of the team?" : "New to LearnAI?"}
          <Link to={register ? "/login" : "/register"}>
            {register ? "Sign in" : "Create an account"}
            <ArrowUpRight size={14} />
          </Link>
        </div>
        <div className={`auth-form-wrap ${register ? "register-form" : ""}`}>
          <div className="auth-mobile-logo">
            <Logo />
          </div>
          <span className="auth-form-icon">
            <Terminal size={24} />
          </span>
          <div className="eyebrow">
            {register ? "YOUR NEXT CHAPTER" : "BACK TO BUILDING"}
          </div>
          <h2>{register ? "Make room for growth." : "Welcome back."}</h2>
          <p className="auth-form-description">
            {register
              ? "Create your account. Build something you’re proud of."
              : "Pick up where you left off. Your next challenge awaits."}
          </p>
          <form onSubmit={submit} className="auth-form">
            {register && (
              <>
                <Field label="Full name">
                  <input
                    autoComplete="name"
                    required
                    maxLength={80}
                    placeholder="Alex Morgan"
                    value={values.name}
                    onChange={update("name")}
                  />
                </Field>
                <Field
                  label="Username"
                  hint="3–30 characters. Letters, numbers, and underscores."
                >
                  <input
                    autoComplete="username"
                    required
                    pattern="[a-zA-Z0-9_]{3,30}"
                    placeholder="alex_codes"
                    value={values.username}
                    onChange={update("username")}
                  />
                </Field>
              </>
            )}
            <Field label="Email address">
              <input
                autoComplete="email"
                type="email"
                required
                maxLength={254}
                placeholder="you@company.com"
                value={values.email}
                onChange={update("email")}
              />
            </Field>
            <Field
              label="Password"
              hint={
                register
                  ? "At least 10 characters. Make it uniquely yours."
                  : undefined
              }
            >
              <div className="password-input">
                <input
                  autoComplete={register ? "new-password" : "current-password"}
                  type={show ? "text" : "password"}
                  minLength={register ? 10 : 1}
                  maxLength={72}
                  required
                  placeholder={
                    register
                      ? "Create a strong password"
                      : "Enter your password"
                  }
                  value={values.password}
                  onChange={update("password")}
                />
                <button
                  type="button"
                  aria-label={show ? "Hide password" : "Show password"}
                  onClick={() => setShow(!show)}
                >
                  {show ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </Field>
            {register && (
              <Field label="Confirm password">
                <input
                  autoComplete="new-password"
                  type={show ? "text" : "password"}
                  required
                  maxLength={72}
                  placeholder="One more time"
                  value={values.confirm}
                  onChange={update("confirm")}
                />
              </Field>
            )}
            {error && (
              <div className="inline-error" role="alert">
                <AlertCircle size={17} />
                <span>{error}</span>
              </div>
            )}
            <Button type="submit" loading={busy} className="auth-submit">
              {register ? "Create your account" : "Sign in to your workspace"}
              {!busy && <ArrowRight size={17} />}
            </Button>
          </form>
          <div className="secure-note">
            <LockKeyhole size={13} />
            <span>Secure sign-in. Your code, your progress.</span>
          </div>
          {auth.error && (
            <div className="connection-note">
              <AlertCircle size={14} />
              <p>
                The backend isn’t reachable yet. Your workspace will connect as
                soon as the API and MongoDB are running.
              </p>
            </div>
          )}
          <div className="auth-form-bottom">
            <span />
            Less watching. More building.
            <span />
          </div>
        </div>
        <div className="auth-footer">
          <span>© {new Date().getFullYear()} LearnAI</span>
          <span>
            A workspace for curious minds <Sparkles size={13} />
          </span>
        </div>
      </section>
    </div>
  );
}
