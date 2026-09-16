import React, { useState } from "react";
import { AlertCircle, CheckCircle2, KeyRound } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { resetPassword } from "../services/authService";
const validate = (value) => {
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
export default function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState({ password: "", confirm: "" });
  const [state, setState] = useState({
    loading: false,
    error: "",
    success: false,
  });
  const submit = async (e) => {
    e.preventDefault();
    const invalid = validate(form.password);
    if (invalid)
      return setState({ loading: false, error: invalid, success: false });
    if (form.password !== form.confirm)
      return setState({
        loading: false,
        error: "Passwords do not match.",
        success: false,
      });
    setState({ loading: true, error: "", success: false });
    try {
      await resetPassword(token, form.password);
      setState({ loading: false, error: "", success: true });
    } catch (error) {
      setState({
        loading: false,
        error: error.message || "The reset link is invalid or expired.",
        success: false,
      });
    }
  };
  return (
    <div className="page-narrow page">
      <div className="card card-pad">
        {state.success ? (
          <div className="state">
            <div>
              <div className="state-visual">
                <CheckCircle2 size={36} />
              </div>
              <h1>Password updated</h1>
              <p>You can now sign in with your new password.</p>
              <button
                className="btn btn-primary"
                onClick={() => navigate("/login")}
              >
                Sign in
              </button>
            </div>
          </div>
        ) : (
          <form className="stack" onSubmit={submit}>
            <div>
              <span className="icon-box">
                <KeyRound size={20} />
              </span>
              <h1 className="page-title">Choose a new password</h1>
              <p className="page-copy">
                This reset link is single-use and time limited.
              </p>
            </div>
            {state.error && (
              <div className="notice notice-error" role="alert">
                <AlertCircle size={18} />
                {state.error}
              </div>
            )}
            <div className="field">
              <label htmlFor="new-password">New password</label>
              <input
                className="input"
                id="new-password"
                type="password"
                required
                autoComplete="new-password"
                value={form.password}
                onChange={(e) =>
                  setForm((v) => ({ ...v, password: e.target.value }))
                }
              />
            </div>
            <div className="field">
              <label htmlFor="confirm-password">Confirm password</label>
              <input
                className="input"
                id="confirm-password"
                type="password"
                required
                autoComplete="new-password"
                value={form.confirm}
                onChange={(e) =>
                  setForm((v) => ({ ...v, confirm: e.target.value }))
                }
              />
            </div>
            <button className="btn btn-primary" disabled={state.loading}>
              {state.loading ? "Updating…" : "Update password"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
