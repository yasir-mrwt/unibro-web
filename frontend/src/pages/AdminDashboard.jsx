import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Check, ExternalLink, FileText, Search, Users, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { API_URL } from "../services/config";
import {
  approveResource,
  getAllResourcesAdmin,
  rejectResource,
} from "../services/resourceService";
import {
  getAuthToken,
  getStoredUser,
  isAuthenticated,
} from "../services/authService";
import { ErrorState, LoadingState, StatusBadge } from "../components/ui/States";
import { useToast } from "../components/ui/ToastContext";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { notify } = useToast();
  const user = getStoredUser();
  const [section, setSection] = useState("overview");
  const [status, setStatus] = useState("all");
  const [query, setQuery] = useState("");
  const [resources, setResources] = useState([]);
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
  });
  const [state, setState] = useState({ loading: true, error: "" });
  const [rejecting, setRejecting] = useState(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(null);
  const load = useCallback(async () => {
    setState({ loading: true, error: "" });
    try {
      const [resourceData, userResponse] = await Promise.all([
        getAllResourcesAdmin("all"),
        fetch(`${API_URL}/api/users`, {
          headers: { Authorization: `Bearer ${getAuthToken()}` },
        }),
      ]);
      const userData = await userResponse.json();
      if (!userResponse.ok)
        throw new Error(userData.message || "Unable to load users");
      setResources(resourceData.resources || []);
      setStats(resourceData.stats || {});
      setUsers(userData.users || []);
      setState({ loading: false, error: "" });
    } catch (error) {
      setState({ loading: false, error: error.message });
    }
  }, []);
  useEffect(() => {
    if (!isAuthenticated()) navigate("/login", { replace: true });
    else if (user?.role !== "admin") navigate("/dashboard", { replace: true });
    else load();
  }, [navigate, user?.role, load]);
  const filteredResources = useMemo(
    () =>
      resources.filter(
        (item) =>
          (status === "all" || item.status === status) &&
          `${item.title} ${item.courseName} ${item.uploaderName}`
            .toLowerCase()
            .includes(query.toLowerCase()),
      ),
    [resources, status, query],
  );
  const filteredUsers = useMemo(
    () =>
      users.filter((item) =>
        `${item.fullName} ${item.email} ${item.role}`
          .toLowerCase()
          .includes(query.toLowerCase()),
      ),
    [users, query],
  );
  const approve = async (id) => {
    setBusy(id);
    try {
      await approveResource(id);
      notify("Resource approved.");
      await load();
    } catch (error) {
      notify(error.message, "error");
    } finally {
      setBusy(null);
    }
  };
  const reject = async () => {
    if (reason.trim().length < 3) return;
    setBusy(rejecting._id);
    try {
      await rejectResource(rejecting._id, reason);
      notify("Resource rejected and its file removed.");
      setRejecting(null);
      setReason("");
      await load();
    } catch (error) {
      notify(error.message, "error");
    } finally {
      setBusy(null);
    }
  };
  if (state.loading)
    return (
      <div className="container page">
        <LoadingState label="Loading administration" rows={6} />
      </div>
    );
  if (state.error)
    return (
      <div className="container page">
        <ErrorState message={state.error} onRetry={load} />
      </div>
    );
  const nav = [
    ["overview", "Overview"],
    ["resources", "Resources / moderation"],
    ["users", "Users"],
    ["staff", "Staff"],
  ];
  return (
    <div className="container page">
      <div className="page-header">
        <div>
          <span className="eyebrow">Administration</span>
          <h1 className="page-title">Campus operations</h1>
          <p className="page-copy">
            Moderate shared material and review the people and directory behind
            UniBro.
          </p>
        </div>
        <span className="badge badge-brand">Administrator</span>
      </div>
      <div className="tabs" style={{ marginBottom: 22 }}>
        {nav.map(([key, label]) => (
          <button
            className={`tab${section === key ? " active" : ""}`}
            key={key}
            onClick={() => {
              setSection(key);
              setQuery("");
            }}
          >
            {label}
          </button>
        ))}
      </div>
      {section === "overview" && (
        <div className="stack">
          <div className="resource-type-grid">
            {[
              ["Total resources", stats.total],
              ["Pending review", stats.pending],
              ["Approved", stats.approved],
              ["Rejected", stats.rejected],
            ].map(([label, value]) => (
              <article className="card card-pad" key={label}>
                <span className="muted small">{label}</span>
                <strong
                  style={{ display: "block", fontSize: "2rem", marginTop: 8 }}
                >
                  {value || 0}
                </strong>
              </article>
            ))}
          </div>
          <div className="card card-pad">
            <div className="split">
              <div>
                <h2 className="section-title">Needs attention</h2>
                <p className="page-copy">
                  {stats.pending || 0} resource
                  {stats.pending === 1 ? " is" : "s are"} waiting for review.
                </p>
              </div>
              <button
                className="btn btn-primary"
                onClick={() => {
                  setSection("resources");
                  setStatus("pending");
                }}
              >
                Open moderation
              </button>
            </div>
          </div>
        </div>
      )}
      {section === "resources" && (
        <section>
          <div className="toolbar">
            <div className="input-wrap">
              <Search />
              <input
                className="input"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search resources or uploaders"
              />
            </div>
            <select
              className="select"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              {["all", "pending", "approved", "rejected"].map((value) => (
                <option value={value} key={value}>
                  {value.charAt(0).toUpperCase() + value.slice(1)}
                </option>
              ))}
            </select>
          </div>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Resource</th>
                  <th>Context</th>
                  <th>Uploader</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredResources.map((item) => (
                  <tr key={item._id}>
                    <td>
                      <strong>{item.title}</strong>
                      <br />
                      <span className="muted small">{item.courseName}</span>
                    </td>
                    <td>
                      {item.department}
                      <br />
                      <span className="muted small">
                        Semester {item.semester} · {item.resourceType}
                      </span>
                    </td>
                    <td>{item.uploaderName}</td>
                    <td>
                      <StatusBadge status={item.status} />
                    </td>
                    <td>
                      <div className="cluster">
                        <a
                          className="btn btn-secondary btn-icon btn-sm"
                          href={item.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          aria-label="Preview file"
                        >
                          <ExternalLink size={15} />
                        </a>
                        {item.status === "pending" && (
                          <>
                            <button
                              className="btn btn-primary btn-sm"
                              disabled={busy === item._id}
                              onClick={() => approve(item._id)}
                            >
                              <Check size={15} /> Approve
                            </button>
                            <button
                              className="btn btn-danger btn-sm"
                              disabled={busy === item._id}
                              onClick={() => setRejecting(item)}
                            >
                              <X size={15} /> Reject
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!filteredResources.length && (
              <div className="state" style={{ minHeight: 180 }}>
                <div>
                  <FileText size={30} className="muted" />
                  <h3>No resources found</h3>
                  <p>Change the search or status filter.</p>
                </div>
              </div>
            )}
          </div>
        </section>
      )}
      {section === "users" && (
        <section>
          <div
            className="input-wrap"
            style={{ maxWidth: 460, marginBottom: 18 }}
          >
            <Search />
            <input
              className="input"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search users"
            />
          </div>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th>Verification</th>
                  <th>Provider</th>
                  <th>Joined</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((item) => (
                  <tr key={item._id}>
                    <td>
                      <strong>{item.fullName}</strong>
                      <br />
                      <span className="muted small">{item.email}</span>
                    </td>
                    <td>
                      <span className="badge">{item.role}</span>
                    </td>
                    <td>
                      <span
                        className={`badge ${item.isVerified ? "badge-success" : "badge-warning"}`}
                      >
                        {item.isVerified ? "Verified" : "Unverified"}
                      </span>
                    </td>
                    <td>{item.authProvider}</td>
                    <td>
                      {new Intl.DateTimeFormat(undefined, {
                        dateStyle: "medium",
                      }).format(new Date(item.createdAt))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
      {section === "staff" && (
        <div className="card card-pad">
          <div className="split">
            <div>
              <span className="icon-box">
                <Users size={20} />
              </span>
              <h2 className="section-title" style={{ marginTop: 16 }}>
                Staff directory management
              </h2>
              <p className="page-copy">
                Add, update, and remove faculty records from the same directory
                students use.
              </p>
            </div>
            <button
              className="btn btn-primary"
              onClick={() => navigate("/staff")}
            >
              Manage staff
            </button>
          </div>
        </div>
      )}
      {rejecting && (
        <div className="dialog-backdrop">
          <div
            className="dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="reject-title"
          >
            <div className="dialog-head">
              <h2 className="section-title" id="reject-title">
                Reject “{rejecting.title}”?
              </h2>
              <button
                className="btn btn-ghost btn-icon"
                onClick={() => setRejecting(null)}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>
            <div className="dialog-body stack">
              <div className="notice notice-error">
                Rejecting removes the stored file. Explain what the student
                should correct.
              </div>
              <div className="field">
                <label htmlFor="reason">Reason</label>
                <textarea
                  id="reason"
                  className="textarea"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  minLength={3}
                  maxLength={1000}
                />
              </div>
              <div className="cluster" style={{ justifyContent: "flex-end" }}>
                <button
                  className="btn btn-secondary"
                  onClick={() => setRejecting(null)}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-danger"
                  disabled={busy === rejecting._id || reason.trim().length < 3}
                  onClick={reject}
                >
                  Reject resource
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
