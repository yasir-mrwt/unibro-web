import React, { useEffect, useState } from "react";
import { AlertCircle, ArrowLeft, CheckCircle2, X } from "lucide-react";
import { forgotPassword } from "../../services/authService";
export default function ForgotPasswordModal({
  isOpen,
  onClose,
  onBackToLogin,
}) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  useEffect(() => {
    if (!isOpen) return;
    const key = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, [isOpen, onClose]);
  if (!isOpen) return null;
  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await forgotPassword(email);
      setSuccess(true);
    } catch (err) {
      setError(err.message || "Could not send the reset email.");
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="dialog-backdrop">
      <div
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="forgot-title"
      >
        <div className="dialog-head">
          <button className="btn btn-ghost btn-sm" onClick={onBackToLogin}>
            <ArrowLeft size={16} /> Sign in
          </button>
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
            <div className="state" style={{ minHeight: 230 }}>
              <div>
                <div className="state-visual">
                  <CheckCircle2 size={34} />
                </div>
                <h2 id="forgot-title">Check your email</h2>
                <p>
                  If an account exists for that address, a secure reset link has
                  been sent.
                </p>
                <button className="btn btn-primary" onClick={onClose}>
                  Done
                </button>
              </div>
            </div>
          ) : (
            <form className="stack" onSubmit={submit}>
              <div>
                <span className="eyebrow">Account recovery</span>
                <h2 className="section-title" id="forgot-title">
                  Reset your password
                </h2>
                <p className="page-copy">
                  We’ll email a time-limited reset link.
                </p>
              </div>
              {error && (
                <div className="notice notice-error" role="alert">
                  <AlertCircle size={18} />
                  {error}
                </div>
              )}
              <div className="field">
                <label htmlFor="forgot-email">Email</label>
                <input
                  className="input"
                  id="forgot-email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <button className="btn btn-primary" disabled={loading}>
                {loading ? "Sending…" : "Send reset link"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
