import React, { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  BookUp,
  LogOut,
  Menu,
  Moon,
  Settings,
  ShieldCheck,
  Sun,
  UserRound,
  X,
} from "lucide-react";
import { useTheme } from "./ThemeContext";
import Brand from "./Brand";
import LoginForm from "./authentication/loginForm";
import RegisterForm from "./authentication/registerForm";
import { getStoredUser, logout } from "../services/authService";

const baseLinks = [
  ["Dashboard", "/dashboard"],
  ["Resources", "/resources"],
  ["Community", "/community"],
  ["Staff", "/staff"],
  ["My uploads", "/my-posts"],
];

export default function Navbar() {
  const { darkMode, toggleDarkMode } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const menuRef = useRef(null);
  const [user, setUser] = useState(getStoredUser());
  const [mobileOpen, setMobileOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [authView, setAuthView] = useState(
    location.state?.showLogin ? "login" : null,
  );

  useEffect(() => {
    const sync = () => setUser(getStoredUser());
    window.addEventListener("storage", sync);
    window.addEventListener("userLoggedIn", sync);
    window.addEventListener("userUpdated", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("userLoggedIn", sync);
      window.removeEventListener("userUpdated", sync);
    };
  }, []);
  useEffect(() => {
    setMobileOpen(false);
    setAccountOpen(false);
  }, [location.pathname]);
  useEffect(() => {
    if (location.state?.showLogin) setAuthView("login");
    if (location.state?.showRegister) setAuthView("register");
  }, [location.state]);
  useEffect(() => {
    const close = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target))
        setAccountOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);

  const signOut = async () => {
    await logout();
    setUser(null);
    setAccountOpen(false);
    navigate("/");
  };
  const onAuthSuccess = (nextUser) => {
    setUser(nextUser);
    window.dispatchEvent(new CustomEvent("userLoggedIn", { detail: nextUser }));
  };
  const navLinks =
    user?.role === "admin"
      ? [...baseLinks, ["Admin", "/admin/dashboard"]]
      : baseLinks;

  return (
    <>
      <header className="site-header">
        <div className="container site-header-inner">
          <Link to="/" className="brand" aria-label="UniBro home">
            <Brand />
          </Link>
          <nav className="primary-nav" aria-label="Primary navigation">
            {user
              ? navLinks.map(([label, path]) => (
                  <NavLink
                    key={path}
                    to={path}
                    className={({ isActive }) =>
                      `nav-link${isActive ? " active" : ""}`
                    }
                  >
                    {label}
                  </NavLink>
                ))
              : [
                  ["How it works", "how-it-works"],
                  ["What you get", "what-you-get"],
                  ["About", "why-unibro"],
                ].map(([label, anchor]) => (
                  <a className="nav-link" href={`/#${anchor}`} key={anchor}>
                    {label}
                  </a>
                ))}
          </nav>
          <div className="header-actions">
            {user && (
              <Link
                className="btn btn-primary btn-sm header-upload"
                to="/upload-modal"
              >
                <BookUp size={16} /> Upload
              </Link>
            )}
            <button
              className="btn btn-ghost btn-icon"
              onClick={toggleDarkMode}
              aria-label={darkMode ? "Use light mode" : "Use dark mode"}
            >
              {darkMode ? <Sun size={19} /> : <Moon size={19} />}
            </button>
            {user ? (
              <div className="account-menu" ref={menuRef}>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => setAccountOpen((open) => !open)}
                  aria-expanded={accountOpen}
                >
                  <UserRound size={16} />
                  <span className="header-label">
                    {user.fullName?.split(" ")[0] || "Account"}
                  </span>
                </button>
                {accountOpen && (
                  <div className="account-popover">
                    <div className="account-summary">
                      <strong>{user.fullName}</strong>
                      <span className="muted small">{user.email}</span>
                    </div>
                    <Link to="/profile-settings">
                      <Settings size={16} /> Profile settings
                    </Link>
                    {user.role === "admin" && (
                      <Link to="/admin/dashboard">
                        <ShieldCheck size={16} /> Administration
                      </Link>
                    )}
                    <button onClick={signOut}>
                      <LogOut size={16} /> Sign out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <button className="btn btn-ghost btn-sm public-sign-in" onClick={() => setAuthView("login")}>Sign in</button>
                <button className="btn btn-primary btn-sm public-get-started" onClick={() => setAuthView("register")}>Get started</button>
              </>
            )}
            <button
              className="btn btn-ghost btn-icon mobile-menu-button"
              onClick={() => setMobileOpen((open) => !open)}
              aria-label="Toggle navigation"
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </header>
      {mobileOpen && (
        <nav className="mobile-nav" aria-label="Mobile navigation">
          {user ? (
            <>
              {navLinks.map(([label, path]) => <NavLink key={path} to={path} className="nav-link">{label}</NavLink>)}
              <Link className="nav-link" to="/upload-modal">Upload resource</Link>
            </>
          ) : (
            <>
              <a className="nav-link" href="/#how-it-works">How it works</a>
              <a className="nav-link" href="/#what-you-get">What you get</a>
              <a className="nav-link" href="/#why-unibro">About</a>
              <button className="btn btn-primary" onClick={() => setAuthView("register")}>Get started</button>
            </>
          )}
        </nav>
      )}
      <LoginForm
        isOpen={authView === "login"}
        onClose={() => setAuthView(null)}
        onSwitchToRegister={() => setAuthView("register")}
        onLoginSuccess={onAuthSuccess}
      />
      <RegisterForm
        isOpen={authView === "register"}
        onClose={() => setAuthView(null)}
        onSwitchToLogin={() => setAuthView("login")}
        onRegisterSuccess={onAuthSuccess}
      />
    </>
  );
}
