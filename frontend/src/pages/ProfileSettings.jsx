import React, { useEffect, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  KeyRound,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { API_URL } from "../services/config";
import {
  getAuthToken,
  getStoredUser,
  isAuthenticated,
  updateStoredUser,
} from "../services/authService";

export default function ProfileSettings() {
  const navigate = useNavigate();
  const [user, setUser] = useState(getStoredUser());
  const [tab, setTab] = useState("profile");
  const [profile, setProfile] = useState({
    fullName: user?.fullName || "",
    email: user?.email || "",
  });
  const [password, setPassword] = useState({
    currentPassword: "",
    newPassword: "",
    confirm: "",
  });
  const [state, setState] = useState({
    loading: false,
    error: "",
    success: "",
  });
  useEffect(() => {
    if (!isAuthenticated()) navigate("/login", { replace: true });
  }, [navigate]);
  const request = async (path, body) => {
    const response = await fetch(`${API_URL}/api/users/${path}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getAuthToken()}`,
      },
      body: JSON.stringify(body),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Update failed");
    return data;
  };
  const saveProfile = async (e) => {
    e.preventDefault();
    setState({ loading: true, error: "", success: "" });
    try {
      const data = await request("profile", profile);
      const updated = updateStoredUser(data.user);
      setUser(updated);
      setState({ loading: false, error: "", success: data.message });
    } catch (error) {
      setState({ loading: false, error: error.message, success: "" });
    }
  };
  const savePassword = async (e) => {
    e.preventDefault();
    if (password.newPassword !== password.confirm)
      return setState({
        loading: false,
        error: "Passwords do not match.",
        success: "",
      });
    setState({ loading: true, error: "", success: "" });
    try {
      const data = await request("change-password", {
        currentPassword: password.currentPassword,
        newPassword: password.newPassword,
      });
      setPassword({ currentPassword: "", newPassword: "", confirm: "" });
      setState({ loading: false, error: "", success: data.message });
    } catch (error) {
      setState({ loading: false, error: error.message, success: "" });
    }
  };
  if (!user) return null;
  return (
    <div className="container page">
      <div className="page-header">
        <div>
          <span className="eyebrow">Account</span>
          <h1 className="page-title">Profile settings</h1>
          <p className="page-copy">
            Manage your identity, verification, and account security.
          </p>
        </div>
        <span
          className={`badge ${user.isVerified ? "badge-success" : "badge-warning"}`}
        >
          <ShieldCheck size={14} />
          {user.isVerified ? "Email verified" : "Verification required"}
        </span>
      </div>
      <div className="browser-layout">
        <aside className="card card-pad">
          <div className="cluster">
            <span className="icon-box">
              <UserRound size={20} />
            </span>
            <div style={{ minWidth: 0 }}>
              <strong
                style={{
                  display: "block",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {user.fullName}
              </strong>
              <span className="muted small">
                {user.role} · {user.authProvider}
              </span>
            </div>
          </div>
          <div className="tabs" style={{ display: "grid", marginTop: 20 }}>
            <button
              className={`tab${tab === "profile" ? " active" : ""}`}
              onClick={() => {
                setTab("profile");
                setState({ loading: false, error: "", success: "" });
              }}
            >
              Profile
            </button>
            <button
              className={`tab${tab === "security" ? " active" : ""}`}
              onClick={() => {
                setTab("security");
                setState({ loading: false, error: "", success: "" });
              }}
            >
              Security
            </button>
          </div>
        </aside>
        <section className="card card-pad">
          {state.error && (
            <div
              className="notice notice-error"
              role="alert"
              style={{ marginBottom: 16 }}
            >
              <AlertCircle size={18} />
              {state.error}
            </div>
          )}
          {state.success && (
            <div
              className="notice notice-success"
              role="status"
              style={{ marginBottom: 16 }}
            >
              <CheckCircle2 size={18} />
              {state.success}
            </div>
          )}
          {tab === "profile" ? (
            <form className="stack" onSubmit={saveProfile}>
              <div>
                <h2 className="section-title">Personal information</h2>
                <p className="page-copy">
                  Changing your email requires verification again.
                </p>
              </div>
              <div className="field">
                <label htmlFor="profile-name">Full name</label>
                <input
                  className="input"
                  id="profile-name"
                  minLength={2}
                  maxLength={100}
                  required
                  value={profile.fullName}
                  onChange={(e) =>
                    setProfile((v) => ({ ...v, fullName: e.target.value }))
                  }
                />
              </div>
              <div className="field">
                <label htmlFor="profile-email">Email</label>
                <input
                  className="input"
                  id="profile-email"
                  type="email"
                  required
                  value={profile.email}
                  onChange={(e) =>
                    setProfile((v) => ({ ...v, email: e.target.value }))
                  }
                />
              </div>
              <button
                className="btn btn-primary"
                style={{ justifySelf: "start" }}
                disabled={state.loading}
              >
                {state.loading ? "Saving…" : "Save changes"}
              </button>
            </form>
          ) : user.authProvider === "google" ? (
            <div className="state" style={{ minHeight: 250 }}>
              <div>
                <KeyRound size={34} className="muted" />
                <h2>Managed by Google</h2>
                <p>Your account does not use a local UniBro password.</p>
              </div>
            </div>
          ) : (
            <form className="stack" onSubmit={savePassword}>
              <div>
                <h2 className="section-title">Change password</h2>
                <p className="page-copy">
                  Use 8+ characters with uppercase, lowercase, a number, and a
                  symbol.
                </p>
              </div>
              <div className="field">
                <label htmlFor="current-password">Current password</label>
                <input
                  className="input"
                  id="current-password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password.currentPassword}
                  onChange={(e) =>
                    setPassword((v) => ({
                      ...v,
                      currentPassword: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="field">
                <label htmlFor="new-password">New password</label>
                <input
                  className="input"
                  id="new-password"
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  required
                  value={password.newPassword}
                  onChange={(e) =>
                    setPassword((v) => ({ ...v, newPassword: e.target.value }))
                  }
                />
              </div>
              <div className="field">
                <label htmlFor="confirm-password">Confirm new password</label>
                <input
                  className="input"
                  id="confirm-password"
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  required
                  value={password.confirm}
                  onChange={(e) =>
                    setPassword((v) => ({ ...v, confirm: e.target.value }))
                  }
                />
              </div>
              <button
                className="btn btn-primary"
                style={{ justifySelf: "start" }}
                disabled={state.loading}
              >
                {state.loading ? "Updating…" : "Update password"}
              </button>
            </form>
          )}
        </section>
      </div>
    </div>
  );
}
