import React, { useEffect, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, Eye, EyeOff, X } from "lucide-react";
import { register } from "../../services/authService";
import Brand from "../Brand";

const passwordError = (value) => {
  if (value.length < 8) return "Use at least 8 characters.";
  if (
    !/[a-z]/.test(value) ||
    !/[A-Z]/.test(value) ||
    !/[0-9]/.test(value) ||
    !/[\W_]/.test(value)
  )
    return "Include uppercase, lowercase, number, and special character.";
  return "";
};
export default function RegisterForm({
  isOpen,
  onClose,
  onSwitchToLogin,
  onRegisterSuccess,
}) {
  const titleRef = useRef(null);
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
    confirm: "",
  });
  const [show, setShow] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  useEffect(() => {
    if (!isOpen) return;
    titleRef.current?.focus();
    const key = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", key);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", key);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);
  if (!isOpen) return null;
  const change = (e) =>
    setForm((v) => ({ ...v, [e.target.name]: e.target.value }));
  const submit = async (e) => {
    e.preventDefault();
    const invalid = passwordError(form.password);
    if (invalid) return setError(invalid);
    if (form.password !== form.confirm)
      return setError("Passwords do not match.");
    if (!agreed)
      return setError(
        "Confirm that you will follow the community and sharing rules.",
      );
    setLoading(true);
    setError("");
    try {
      const response = await register({
        fullName: form.fullName,
        email: form.email,
        password: form.password,
      });
      setSuccess(true);
      onRegisterSuccess?.(response.user);
    } catch (err) {
      setError(err.message || "Registration failed.");
    } finally {
      setLoading(false);
    }
  };
  return (
    <div
      className="dialog-backdrop"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="dialog auth-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="register-title"
      >
        <div className="dialog-head">
          <div className="auth-heading">
            <Brand />
            <div>
              <span className="eyebrow">Join your campus</span>
              <h2
                className="section-title"
                id="register-title"
                tabIndex="-1"
                ref={titleRef}
              >
                Create an account
              </h2>
            </div>
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
          {success ? (
            <div className="state" style={{ minHeight: 260 }}>
              <div>
                <div className="state-visual">
                  <CheckCircle2 size={34} />
                </div>
                <h3>Check your inbox</h3>
                <p>
                  Your account is ready. Verify your email to upload resources
                  and send messages.
                </p>
                <button className="btn btn-primary" onClick={onClose}>
                  Continue
                </button>
              </div>
            </div>
          ) : (
            <form className="stack" onSubmit={submit}>
              {error && (
                <div className="notice notice-error" role="alert">
                  <AlertCircle size={18} />
                  {error}
                </div>
              )}
              <div className="field">
                <label htmlFor="fullName">Full name</label>
                <input
                  className="input"
                  id="fullName"
                  name="fullName"
                  minLength={2}
                  maxLength={100}
                  required
                  autoComplete="name"
                  value={form.fullName}
                  onChange={change}
                />
              </div>
              <div className="field">
                <label htmlFor="register-email">Email</label>
                <input
                  className="input"
                  id="register-email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={form.email}
                  onChange={change}
                />
              </div>
              <div className="field">
                <label htmlFor="register-password">Password</label>
                <div className="input-wrap">
                  <input
                    className="input"
                    style={{ paddingLeft: 12, paddingRight: 44 }}
                    id="register-password"
                    name="password"
                    type={show ? "text" : "password"}
                    required
                    autoComplete="new-password"
                    value={form.password}
                    onChange={change}
                  />
                  <button
                    type="button"
                    className="btn btn-ghost btn-icon"
                    style={{ position: "absolute", right: 2, top: 1 }}
                    onClick={() => setShow((v) => !v)}
                    aria-label={show ? "Hide password" : "Show password"}
                  >
                    {show ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
                <span className="muted small">
                  8+ characters with upper/lowercase, a number, and a symbol.
                </span>
              </div>
              <div className="field">
                <label htmlFor="confirm">Confirm password</label>
                <input
                  className="input"
                  id="confirm"
                  name="confirm"
                  type={show ? "text" : "password"}
                  required
                  autoComplete="new-password"
                  value={form.confirm}
                  onChange={change}
                />
              </div>
              <label className="cluster small">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                />{" "}
                I’ll follow UniBro’s community and content-sharing rules.
              </label>
              <button className="btn btn-primary" disabled={loading}>
                {loading ? "Creating account…" : "Create account"}
              </button>
              <p
                className="small muted"
                style={{ textAlign: "center", margin: 0 }}
              >
                Already registered?{" "}
                <button
                  className="btn btn-ghost btn-sm"
                  type="button"
                  onClick={onSwitchToLogin}
                >
                  Sign in
                </button>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
