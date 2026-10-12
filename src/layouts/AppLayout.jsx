import {
  NavLink,
  Outlet,
  Link,
  useLocation,
  useNavigate,
} from "react-router-dom";
import {
  LayoutDashboard,
  Code2,
  Trophy,
  UserRound,
  Medal,
  History,
  Settings2,
  Search,
  Bell,
  ChevronDown,
  LogOut,
  Menu,
  X,
  ArrowUpRight,
  ShieldCheck,
  Users,
  ChartNoAxesCombined,
  FileCode2,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { Avatar, Logo } from "../components/UI";
const navigation = [
  ["/", "Dashboard", LayoutDashboard],
  ["/challenges", "Challenges", Code2],
  ["/leaderboard", "Leaderboard", Trophy],
  ["/profile", "Profile", UserRound],
  ["/achievements", "Achievements", Medal],
  ["/history", "History", History],
  ["/settings", "Settings", Settings2],
];
const adminNavigation = [
  ["/admin", "Overview", ShieldCheck],
  ["/admin/challenges", "Challenges", FileCode2],
  ["/admin/users", "Users", Users],
  ["/admin/submissions", "Submissions", History],
  ["/admin/statistics", "Statistics", ChartNoAxesCombined],
];
export default function AppLayout() {
  const { user, logout } = useAuth();
  const toast = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobile, setMobile] = useState(false),
    [menu, setMenu] = useState(""),
    [search, setSearch] = useState(""),
    [loggingOut, setLoggingOut] = useState(false);
  const menuRef = useRef(null);
  const sidebarRef = useRef(null);
  const menuButtonRef = useRef(null);
  const [narrow, setNarrow] = useState(
    () => window.matchMedia("(max-width: 900px)").matches,
  );
  useEffect(() => {
    const media = window.matchMedia("(max-width: 900px)");
    const change = () => setNarrow(media.matches);
    media.addEventListener("change", change);
    return () => media.removeEventListener("change", change);
  }, []);
  const workspace = /^\/challenges\/[^/]+$/.test(location.pathname);
  useEffect(() => {
    setMobile(false);
    setMenu("");
    window.scrollTo(0, 0);
  }, [location.pathname]);
  useEffect(() => {
    const close = (e) => {
      if (!menuRef.current?.contains(e.target)) setMenu("");
    };
    const escape = (e) => {
      if (e.key === "Escape") {
        setMenu("");
        setMobile(false);
        menuButtonRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", escape);
    };
  }, []);
  useEffect(() => {
    if (!mobile) return;
    sidebarRef.current?.querySelector("a")?.focus();
    const trap = (e) => {
      if (e.key !== "Tab") return;
      const nodes = sidebarRef.current.querySelectorAll("a,button");
      const first = nodes[0],
        last = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", trap);
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", trap);
      document.body.style.overflow = old;
    };
  }, [mobile]);
  async function signOut() {
    setLoggingOut(true);
    try {
      await logout();
      toast("You’ve been signed out.");
      navigate("/login");
    } catch (err) {
      toast(err.message, "error");
    } finally {
      setLoggingOut(false);
    }
  }
  const pageName = location.pathname.startsWith("/admin")
    ? "Team administration"
    : navigation.find(([path]) =>
        path === "/"
          ? location.pathname === "/"
          : location.pathname.startsWith(path),
      )?.[1] || "Workspace";
  return (
    <div className={`app-shell ${workspace ? "workspace-shell" : ""}`}>
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      {mobile && (
        <button
          className="sidebar-scrim"
          aria-label="Close navigation"
          onClick={() => setMobile(false)}
        />
      )}
      <aside
        ref={sidebarRef}
        inert={narrow && !mobile ? true : undefined}
        aria-hidden={narrow && !mobile ? true : undefined}
        className={`sidebar ${mobile ? "mobile-open" : ""}`}
        aria-label="Main navigation"
      >
        <div className="sidebar-brand">
          <Logo />
          <button
            className="icon-btn mobile-only"
            aria-label="Close navigation"
            onClick={() => {
              setMobile(false);
              menuButtonRef.current?.focus();
            }}
          >
            <X size={20} />
          </button>
        </div>
        <div className="workspace-label">
          <span className="workspace-dot" />
          Your learning workspace<span className="small-code">⌘</span>
        </div>
        <div className="nav-section-label">WORKSPACE</div>
        <nav>
          {navigation.map(([path, label, Icon]) => (
            <NavLink key={path} to={path} end={path === "/"}>
              <Icon size={18} />
              <span>{label}</span>
              {path === "/challenges" && <span className="nav-dot" />}
            </NavLink>
          ))}
        </nav>
        {user.role === "admin" && (
          <>
            <div className="nav-section-label admin-nav-label">
              ADMINISTRATION
            </div>
            <nav>
              {adminNavigation.map(([path, label, Icon]) => (
                <NavLink key={path} to={path} end={path === "/admin"}>
                  <Icon size={17} />
                  <span>{label}</span>
                </NavLink>
              ))}
            </nav>
          </>
        )}
        <div className="sidebar-bottom">
          <div className="daily-card">
            <span className="daily-icon">
              <Sparkles size={19} />
            </span>
            <h4>A little practice. A lot of progress.</h4>
            <p>Your next breakthrough starts with one challenge.</p>
            <Link to="/challenges">
              Keep building
              <ArrowUpRight size={15} />
            </Link>
          </div>
          <div className="sidebar-user">
            <Avatar user={user} />
            <div>
              <strong>{user.name}</strong>
              <span>
                {user.role === "admin"
                  ? "Team administrator"
                  : "Your developer journey"}
              </span>
            </div>
            <button
              className="icon-btn"
              onClick={signOut}
              disabled={loggingOut}
              aria-label="Sign out"
            >
              <LogOut size={17} />
            </button>
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="topbar-left">
            <button
              ref={menuButtonRef}
              className="icon-btn mobile-only"
              onClick={() => setMobile(true)}
              aria-expanded={mobile}
              aria-label="Open navigation"
            >
              <Menu size={22} />
            </button>
            <span className="breadcrumb">
              Workspace<span>/</span>
              <strong>{pageName}</strong>
            </span>
          </div>
          <div className="topbar-right">
            <Link
              className="mobile-search-link icon-btn"
              to="/challenges"
              aria-label="Find a challenge"
            >
              <Search size={18} />
            </Link>
            <form
              className="global-search"
              role="search"
              onSubmit={(e) => {
                e.preventDefault();
                navigate(
                  `/challenges?search=${encodeURIComponent(search.trim())}`,
                );
              }}
            >
              <Search size={16} />
              <input
                aria-label="Search challenges"
                placeholder="Search challenges…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <button type="submit" aria-label="Submit search">
                <ArrowRight size={14} />
              </button>
            </form>
            <div className="topbar-menus" ref={menuRef}>
              <button
                className={`icon-btn notification-btn ${menu === "notifications" ? "selected" : ""}`}
                aria-label="Notifications"
                aria-expanded={menu === "notifications"}
                onClick={() =>
                  setMenu(menu === "notifications" ? "" : "notifications")
                }
              >
                <Bell size={19} />
              </button>
              <span className="topbar-divider" />
              <button
                className="user-menu-trigger"
                aria-label="User menu"
                aria-expanded={menu === "user"}
                onClick={() => setMenu(menu === "user" ? "" : "user")}
              >
                <Avatar user={user} size="small" />
                <ChevronDown size={14} />
              </button>
              {menu === "notifications" && (
                <div className="dropdown notifications">
                  <h3>Notifications</h3>
                  <div className="notification-empty">
                    <Bell size={24} />
                    <strong>A quiet moment to focus</strong>
                    <p>
                      Results appear after each submission. There isn’t a
                      notification feed connected yet.
                    </p>
                  </div>
                </div>
              )}
              {menu === "user" && (
                <div className="dropdown">
                  <div className="dropdown-user">
                    <strong>{user.name}</strong>
                    <span>@{user.username}</span>
                  </div>
                  <Link to="/profile">
                    <UserRound size={16} />
                    View profile
                  </Link>
                  <Link to="/settings">
                    <Settings2 size={16} />
                    Account settings
                  </Link>
                  <button onClick={signOut} disabled={loggingOut}>
                    <LogOut size={16} />
                    {loggingOut ? "Signing out…" : "Sign out"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>
        <main
          id="main-content"
          className={workspace ? "workspace-main" : "main-content"}
        >
          <Outlet />
        </main>
        {!workspace && (
          <footer className="app-footer">
            <span>Small steps. Real skills.</span>
            <span>
              Made for the joy of building <Code2 size={14} />
            </span>
          </footer>
        )}
      </div>
    </div>
  );
}
