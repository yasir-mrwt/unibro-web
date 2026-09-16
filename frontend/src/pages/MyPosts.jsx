import React, { useCallback, useEffect, useState } from "react";
import { CalendarDays, FileText, Trash2, UploadCloud, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { deleteResource, getMyResources } from "../services/resourceService";
import { isAuthenticated } from "../services/authService";
import {
  EmptyState,
  ErrorState,
  LoadingState,
  StatusBadge,
} from "../components/ui/States";
import { useToast } from "../components/ui/ToastContext";

const initial = { pending: [], approved: [], rejected: [] };
export default function MyPosts() {
  const navigate = useNavigate();
  const { notify } = useToast();
  const [active, setActive] = useState("pending");
  const [resources, setResources] = useState(initial);
  const [state, setState] = useState({ loading: true, error: "" });
  const [target, setTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const load = useCallback(async () => {
    setState({ loading: true, error: "" });
    try {
      const data = await getMyResources();
      setResources(data.resources || initial);
      setState({ loading: false, error: "" });
    } catch (error) {
      setState({ loading: false, error: error.message });
    }
  }, []);
  useEffect(() => {
    if (!isAuthenticated()) navigate("/login", { replace: true });
    else load();
  }, [navigate, load]);
  const remove = async () => {
    if (!target) return;
    setDeleting(true);
    try {
      await deleteResource(target._id);
      notify("Resource deleted.");
      setTarget(null);
      await load();
    } catch (error) {
      notify(error.message || "Delete failed.", "error");
    } finally {
      setDeleting(false);
    }
  };
  const tabs = ["pending", "approved", "rejected"];
  return (
    <div className="container page">
      <div className="page-header">
        <div>
          <span className="eyebrow">Your contributions</span>
          <h1 className="page-title">My uploads</h1>
          <p className="page-copy">
            Track moderation and manage every resource you’ve shared.
          </p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => navigate("/upload-modal")}
        >
          <UploadCloud size={17} /> New upload
        </button>
      </div>
      <div
        className="tabs"
        role="tablist"
        aria-label="Upload status"
        style={{ width: "fit-content", marginBottom: 20 }}
      >
        {tabs.map((tab) => (
          <button
            className={`tab${active === tab ? " active" : ""}`}
            role="tab"
            aria-selected={active === tab}
            onClick={() => setActive(tab)}
            key={tab}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)} ·{" "}
            {resources[tab].length}
          </button>
        ))}
      </div>
      {state.loading ? (
        <LoadingState label="Loading your uploads" rows={4} />
      ) : state.error ? (
        <ErrorState message={state.error} onRetry={load} />
      ) : resources[active].length === 0 ? (
        <EmptyState
          title={`No ${active} uploads`}
          message={
            active === "pending"
              ? "Anything awaiting review will appear here."
              : active === "approved"
                ? "Approved resources will appear here after moderation."
                : "You have no rejected submissions."
          }
          action={
            <button
              className="btn btn-primary"
              onClick={() => navigate("/upload-modal")}
            >
              Upload a resource
            </button>
          }
        />
      ) : (
        <div className="resource-list">
          {resources[active].map((item) => (
            <article className="resource-row" key={item._id}>
              <span className="icon-box">
                <FileText size={20} />
              </span>
              <div>
                <div className="cluster">
                  <h3>{item.title}</h3>
                  <StatusBadge status={item.status} />
                </div>
                <div className="resource-meta">
                  <span>{item.courseName}</span>
                  <span>{item.resourceType}</span>
                  <span>
                    <CalendarDays size={13} />
                    {new Intl.DateTimeFormat(undefined, {
                      dateStyle: "medium",
                    }).format(new Date(item.createdAt))}
                  </span>
                  {item.rejectionReason && (
                    <span style={{ color: "var(--danger)" }}>
                      Reason: {item.rejectionReason}
                    </span>
                  )}
                </div>
              </div>
              <button
                className="btn btn-danger btn-sm"
                onClick={() => setTarget(item)}
              >
                <Trash2 size={15} /> Delete
              </button>
            </article>
          ))}
        </div>
      )}
      {target && (
        <div
          className="dialog-backdrop"
          role="presentation"
          onMouseDown={(e) => {
            if (e.currentTarget === e.target) setTarget(null);
          }}
        >
          <div
            className="dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-title"
          >
            <div className="dialog-head">
              <h2 id="delete-title" className="section-title">
                Delete this resource?
              </h2>
              <button
                className="btn btn-ghost btn-icon"
                onClick={() => setTarget(null)}
                aria-label="Close"
              >
                <X size={19} />
              </button>
            </div>
            <div className="dialog-body stack">
              <p className="page-copy">
                <strong>{target.title}</strong> and its stored file will be
                permanently removed.
              </p>
              <div className="cluster" style={{ justifyContent: "flex-end" }}>
                <button
                  className="btn btn-secondary"
                  onClick={() => setTarget(null)}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-danger"
                  disabled={deleting}
                  onClick={remove}
                >
                  {deleting ? "Deleting…" : "Delete resource"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
