import React, { useEffect, useRef, useState } from "react";
import { AlertCircle, Eye, EyeOff, X } from "lucide-react";
import { login, loginWithGoogle } from "../../services/authService";
import ForgotPasswordModal from "./ForgotPasswordModal";

export default function LoginForm({
  isOpen,
  onClose,
  onSwitchToRegister,
  onLoginSuccess,
}) {
  const headingRef = useRef(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [forgot, setForgot] = useState(false);
  useEffect(() => {
    if (!isOpen) return;
    headingRef.current?.focus();
    const key = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", key);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", key);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);
  if (!isOpen) return null;
  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await login(email, password, remember);
      onLoginSuccess?.(response.user);
      onClose();
    } catch (err) {
      setError(err.message || "Sign in failed.");
    } finally {
      setLoading(false);
    }
  };
  return (
    <>
      <div
        className="dialog-backdrop"
        onMouseDown={(e) => e.target === e.currentTarget && onClose()}
      >
        <div
          className="dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby="login-title"
        >
          <div className="dialog-head">
            <div>
              <span className="eyebrow">Welcome back</span>
              <h2
                className="section-title"
                id="login-title"
                ref={headingRef}
                tabIndex="-1"
              >
                Sign in to UniBro
              </h2>
            </div>
            <button
              className="btn btn-ghost btn-icon"
              onClick={onClose}
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>
          <div className="dialog-body">
            <form className="stack" onSubmit={submit}>
              {error && (
                <div className="notice notice-error" role="alert">
                  <AlertCircle size={18} />
                  {error}
                </div>
              )}
              <div className="field">
                <label htmlFor="login-email">Email</label>
                <input
                  id="login-email"
                  className="input"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="login-password">Password</label>
                <div className="input-wrap">
                  <input
                    id="login-password"
                    className="input"
                    style={{ paddingLeft: 12, paddingRight: 44 }}
                    type={show ? "text" : "password"}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    className="btn btn-ghost btn-icon"
                    type="button"
                    style={{ position: "absolute", right: 2, top: 1 }}
                    onClick={() => setShow((v) => !v)}
                    aria-label={show ? "Hide password" : "Show password"}
                  >
                    {show ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </div>
              <div className="split">
                <label className="cluster small">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                  />{" "}
                  Remember me
                </label>
                <button
                  className="btn btn-ghost btn-sm"
                  type="button"
                  onClick={() => setForgot(true)}
                >
                  Forgot password?
                </button>
              </div>
              <button className="btn btn-primary" disabled={loading}>
                {loading ? "Signing in…" : "Sign in"}
              </button>
              <button
                className="btn btn-secondary"
                type="button"
                onClick={loginWithGoogle}
              >
                Continue with Google
              </button>
              <p
                className="small muted"
                style={{ textAlign: "center", margin: 0 }}
              >
                New to UniBro?{" "}
                <button
                  className="btn btn-ghost btn-sm"
                  type="button"
                  onClick={onSwitchToRegister}
                >
                  Create an account
                </button>
              </p>
            </form>
          </div>
        </div>
      </div>
      <ForgotPasswordModal
        isOpen={forgot}
        onClose={() => setForgot(false)}
        onBackToLogin={() => setForgot(false)}
      />
    </>
  );
}
