import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  CalendarDays,
  Download,
  Eye,
  FileText,
  Search,
  UploadCloud,
  UserRound,
} from "lucide-react";
import {
  getResources,
  incrementDownload,
  incrementView,
} from "../../services/resourceService";
import { getDownloadUrl, getPreviewUrl } from "../../services/supabaseStorage";
import { EmptyState, ErrorState, LoadingState } from "../ui/States";
import { useToast } from "../ui/ToastContext";

const readContext = () => {
  try {
    return JSON.parse(localStorage.getItem("dashboardData")) || {};
  } catch {
    return {};
  }
};
const flatten = (groups = {}) => Object.values(groups).flat();
const fileKind = (type = "") => type.split("/").pop()?.toUpperCase() || "FILE";
const date = (value) =>
  new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(
    new Date(value),
  );

export default function ResourceDetails() {
  const location = useLocation();
  const navigate = useNavigate();
  const { notify } = useToast();
  const saved = readContext();
  const resourceType =
    location.state?.resourceType ||
    localStorage.getItem("currentResourceType") ||
    "All";
  const department = location.state?.department || saved.department;
  const semester = location.state?.semester || saved.semester;
  const departmentName = department?.name || department || "";
  const [query, setQuery] = useState("");
  const [year, setYear] = useState("All");
  const [sort, setSort] = useState("recent");
  const [selected, setSelected] = useState(null);
  const [state, setState] = useState({ loading: true, error: "", items: [] });
  useEffect(() => {
    localStorage.setItem("currentResourceType", resourceType);
  }, [resourceType]);
  const load = useCallback(async () => {
    if (!departmentName || !semester) return;
    setState((current) => ({ ...current, loading: true, error: "" }));
    try {
      const data = await getResources({
        resourceType,
        department: departmentName,
        semester,
        ...(query && { search: query }),
        ...(year !== "All" && { year }),
      });
      const items = flatten(data.resources);
      setState({ loading: false, error: "", items });
      setSelected(
        (current) =>
          items.find(
            (item) =>
              item._id === (current?._id || location.state?.selectedResourceId),
          ) ||
          items[0] ||
          null,
      );
    } catch (error) {
      setState({ loading: false, error: error.message, items: [] });
    }
  }, [
    departmentName,
    semester,
    resourceType,
    query,
    year,
    location.state?.selectedResourceId,
  ]);
  useEffect(() => {
    const timer = setTimeout(load, 280);
    return () => clearTimeout(timer);
  }, [load]);
  const items = useMemo(
    () =>
      [...state.items].sort((a, b) =>
        sort === "popular"
          ? (b.downloadCount || 0) - (a.downloadCount || 0)
          : sort === "title"
            ? a.title.localeCompare(b.title)
            : new Date(b.createdAt) - new Date(a.createdAt),
      ),
    [state.items, sort],
  );
  const years = [...new Set(state.items.map((item) => item.year))].sort(
    (a, b) => b - a,
  );
  const openPreview = async (item) => {
    setSelected(item);
    await incrementView(item._id);
  };
  const download = async (item) => {
    try {
      await incrementDownload(item._id);
      window.open(
        getDownloadUrl(item.fileUrl),
        "_blank",
        "noopener,noreferrer",
      );
    } catch {
      notify("The download could not be started.", "error");
    }
  };
  if (!departmentName || !semester)
    return (
      <div className="page-narrow page">
        <EmptyState
          title="Choose your study context"
          message="Select a department and semester before browsing resources."
          action={
            <button
              className="btn btn-primary"
              onClick={() => navigate("/select-department")}
            >
              Choose department
            </button>
          }
        />
      </div>
    );
  return (
    <div className="container page">
      <div className="page-header">
        <div>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() =>
              navigate("/dashboard", { state: { department, semester } })
            }
          >
            <ArrowLeft size={16} /> Dashboard
          </button>
          <h1 className="page-title">{resourceType}</h1>
          <div className="context-pills">
            <span className="badge badge-brand">{departmentName}</span>
            <span className="badge">Semester {semester}</span>
            <span className="badge">{state.items.length} resources</span>
          </div>
        </div>
        <div className="cluster">
          <button
            className="btn btn-secondary"
            onClick={() => navigate("/my-posts")}
          >
            My uploads
          </button>
          <button
            className="btn btn-primary"
            onClick={() =>
              navigate("/upload-modal", {
                state: { resourceType, department, semester },
              })
            }
          >
            <UploadCloud size={17} /> Upload
          </button>
        </div>
      </div>
      <div className="toolbar">
        <div className="input-wrap">
          <Search />
          <input
            className="input"
            type="search"
            placeholder={`Search ${resourceType.toLowerCase()}`}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label="Search resources"
          />
        </div>
        <select
          className="select"
          value={year}
          onChange={(event) => setYear(event.target.value)}
          aria-label="Filter by year"
        >
          <option>All</option>
          {years.map((value) => (
            <option key={value}>{value}</option>
          ))}
        </select>
        <select
          className="select"
          value={sort}
          onChange={(event) => setSort(event.target.value)}
          aria-label="Sort resources"
        >
          <option value="recent">Newest first</option>
          <option value="popular">Most downloaded</option>
          <option value="title">Title A–Z</option>
        </select>
      </div>
      {state.loading ? (
        <LoadingState label="Loading resources" rows={5} />
      ) : state.error ? (
        <ErrorState message={state.error} onRetry={load} />
      ) : items.length === 0 ? (
        <EmptyState
          title={query ? "No matching resources" : "No resources yet"}
          message={
            query
              ? "Try a different search or year."
              : `Be the first to share ${resourceType.toLowerCase()} for this semester.`
          }
          action={
            <button
              className="btn btn-primary"
              onClick={() =>
                navigate("/upload-modal", {
                  state: { resourceType, department, semester },
                })
              }
            >
              Upload resource
            </button>
          }
        />
      ) : (
        <div className="browser-layout">
          <div className="resource-list">
            {items.map((item) => (
              <article
                className="resource-row card-interactive"
                key={item._id}
                style={
                  selected?._id === item._id
                    ? { borderColor: "var(--brand)" }
                    : undefined
                }
              >
                <span className="icon-box">
                  <FileText size={20} />
                </span>
                <div>
                  <h3>{item.title}</h3>
                  <div className="resource-meta">
                    <span>{item.courseName}</span>
                    <span>
                      <UserRound size={13} />
                      {item.uploaderName}
                    </span>
                    <span>
                      <CalendarDays size={13} />
                      {date(item.createdAt)}
                    </span>
                    <span>{fileKind(item.fileType)}</span>
                  </div>
                </div>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => openPreview(item)}
                >
                  Preview
                </button>
              </article>
            ))}
          </div>
          <aside
            className="card card-pad preview-pane"
            aria-label="Resource preview"
          >
            {selected ? (
              <div className="stack">
                <div>
                  <span className="eyebrow">Selected resource</span>
                  <h2 className="section-title" style={{ marginTop: 5 }}>
                    {selected.title}
                  </h2>
                  <p className="page-copy">{selected.description}</p>
                </div>
                <div className="resource-meta">
                  <span>{selected.courseName}</span>
                  <span>{selected.fileSize}</span>
                  <span>
                    <Eye size={13} />
                    {selected.viewCount || 0} views
                  </span>
                  <span>
                    <Download size={13} />
                    {selected.downloadCount || 0} downloads
                  </span>
                </div>
                {selected.fileType === "application/pdf" ? (
                  <iframe
                    className="preview-frame"
                    title={`Preview of ${selected.title}`}
                    src={getPreviewUrl(selected.fileUrl)}
                  />
                ) : (
                  <div className="state" style={{ minHeight: 220 }}>
                    <div>
                      <FileText size={34} className="muted" />
                      <h3>Preview in a new tab</h3>
                      <p>This file type uses your browser or desktop app.</p>
                    </div>
                  </div>
                )}
                <div className="cluster">
                  <a
                    className="btn btn-secondary"
                    href={getPreviewUrl(selected.fileUrl)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <Eye size={17} /> Open
                  </a>
                  <button
                    className="btn btn-primary"
                    onClick={() => download(selected)}
                  >
                    <Download size={17} /> Download
                  </button>
                </div>
              </div>
            ) : null}
          </aside>
        </div>
      )}
    </div>
  );
}
