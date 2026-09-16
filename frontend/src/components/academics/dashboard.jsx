import React, { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  BookMarked,
  BookOpen,
  Building2,
  ClipboardList,
  FileText,
  FolderOpen,
  MessageCircle,
  Presentation,
  RefreshCw,
  UploadCloud,
} from "lucide-react";
import { API_URL } from "../../services/config";
import { ErrorState, LoadingState } from "../ui/States";

const types = [
  ["Assignments", ClipboardList],
  ["Quizzes", FileText],
  ["Projects", FolderOpen],
  ["Presentations", Presentation],
  ["Notes", BookOpen],
  ["Past Papers", BookMarked],
];
const storedContext = () => {
  try {
    return JSON.parse(localStorage.getItem("dashboardData"));
  } catch {
    return null;
  }
};

export default function Dashboard() {
  const location = useLocation();
  const navigate = useNavigate();
  const context =
    location.state?.department && location.state?.semester
      ? location.state
      : storedContext();
  const [state, setState] = useState({ loading: true, error: "", counts: {} });
  useEffect(() => {
    if (location.state?.department && location.state?.semester)
      localStorage.setItem("dashboardData", JSON.stringify(location.state));
  }, [location.state]);
  const load = useCallback(async () => {
    if (!context) {
      setState({ loading: false, error: "", counts: {} });
      return;
    }
    setState((current) => ({ ...current, loading: true, error: "" }));
    try {
      const department = context.department?.name || context.department;
      const response = await fetch(
        `${API_URL}/api/resources/counts?department=${encodeURIComponent(department)}&semester=${encodeURIComponent(context.semester)}`,
      );
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.message || "Unable to load resource counts");
      setState({ loading: false, error: "", counts: data.counts || {} });
    } catch (error) {
      setState({ loading: false, error: error.message, counts: {} });
    }
  }, [context?.department, context?.semester]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    load();
  }, [load]);
  if (!context)
    return (
      <div className="page-narrow page">
        <div className="state card">
          <div>
            <Building2 className="muted" size={36} />
            <h1>Set up your workspace</h1>
            <p>Choose a department and semester to open your dashboard.</p>
            <button
              className="btn btn-primary"
              onClick={() => navigate("/select-department")}
            >
              Get started
            </button>
          </div>
        </div>
      </div>
    );
  const departmentName = context.department?.name || context.department;
  const open = (resourceType) =>
    navigate("/resource-details", { state: { ...context, resourceType } });
  return (
    <div className="container page stack">
      <section className="workspace-head">
        <div>
          <span className="eyebrow">Student workspace</span>
          <h1 className="page-title">Ready for semester {context.semester}?</h1>
          <div className="context-pills">
            <span className="badge badge-brand">{departmentName}</span>
            <span className="badge">Semester {context.semester}</span>
          </div>
        </div>
        <div className="cluster">
          <button
            className="btn btn-secondary"
            onClick={() => navigate("/select-department")}
          >
            <RefreshCw size={17} /> Change
          </button>
          <button
            className="btn btn-primary"
            onClick={() => navigate("/upload-modal", { state: context })}
          >
            <UploadCloud size={17} /> Upload
          </button>
        </div>
      </section>
      <section>
        <div className="page-header">
          <div>
            <h2 className="section-title">Browse your library</h2>
            <p className="page-copy">
              Open a category to search, preview, and download approved
              resources.
            </p>
          </div>
        </div>
        {state.loading ? (
          <LoadingState rows={3} />
        ) : state.error ? (
          <ErrorState message={state.error} onRetry={load} />
        ) : (
          <div className="resource-type-grid">
            {types.map(([name, Icon]) => (
              <button
                className="card type-card card-interactive"
                key={name}
                onClick={() => open(name)}
              >
                <span className="icon-box">
                  {React.createElement(Icon, { size: 20 })}
                </span>
                <span style={{ textAlign: "left" }}>
                  <h3>{name}</h3>
                  <span className="muted small">Study resources</span>
                </span>
                <span className="type-count">{state.counts[name] || 0}</span>
              </button>
            ))}
          </div>
        )}
      </section>
      <section className="feature-grid">
        <article className="card card-pad">
          <span className="icon-box accent">
            <MessageCircle size={20} />
          </span>
          <h2 className="section-title" style={{ marginTop: 15 }}>
            Semester community
          </h2>
          <p className="page-copy">
            Join the verified chat for {departmentName}, semester{" "}
            {context.semester}.
          </p>
          <button
            className="btn btn-secondary"
            style={{ marginTop: 15 }}
            onClick={() => navigate("/community", { state: context })}
          >
            Open community
          </button>
        </article>
        <article className="card card-pad" style={{ gridColumn: "span 2" }}>
          <span className="icon-box">
            <UploadCloud size={20} />
          </span>
          <h2 className="section-title" style={{ marginTop: 15 }}>
            Keep the library useful
          </h2>
          <p className="page-copy">
            Share notes, assignments, projects, presentations, quizzes, or past
            papers. You can follow moderation progress from My uploads.
          </p>
          <button
            className="btn btn-ghost"
            style={{ marginTop: 10 }}
            onClick={() => navigate("/my-posts")}
          >
            Manage my uploads
          </button>
        </article>
      </section>
    </div>
  );
}
