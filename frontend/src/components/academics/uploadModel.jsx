import React, { useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AlertCircle, CheckCircle2, File, UploadCloud, X } from "lucide-react";
import { uploadResource } from "../../services/resourceService";
import { getStoredUser, isAuthenticated } from "../../services/authService";

const types = [
  "Assignments",
  "Quizzes",
  "Projects",
  "Presentations",
  "Notes",
  "Past Papers",
];
const departments = [
  "Computer Science",
  "Electrical Engineering",
  "Mechanical Engineering",
  "Industrial Engineering",
  "Mechatronics Engineering",
  "Agricultural Engineering",
  "Chemical Engineering",
  "Civil Engineering",
];
const readContext = () => {
  try {
    return JSON.parse(localStorage.getItem("dashboardData")) || {};
  } catch {
    return {};
  }
};
const allowed =
  /\.(pdf|doc|docx|ppt|pptx|txt|xls|xlsx|zip|rar|7z|jpg|jpeg|png|gif|webp)$/i;

export default function UploadResource() {
  const location = useLocation();
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const saved = readContext();
  const user = getStoredUser();
  const initialDepartment =
    location.state?.department?.name ||
    location.state?.department ||
    saved.department?.name ||
    saved.department ||
    "";
  const [form, setForm] = useState({
    title: "",
    courseName: "",
    description: "",
    resourceType:
      location.state?.resourceType ||
      localStorage.getItem("currentResourceType") ||
      "Notes",
    department: initialDepartment,
    semester: location.state?.semester || saved.semester || "",
    section: "",
    batch: "",
    year: new Date().getFullYear(),
    pages: 0,
  });
  const [file, setFile] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [status, setStatus] = useState({
    loading: false,
    success: false,
    error: "",
  });
  const change = (event) =>
    setForm((value) => ({ ...value, [event.target.name]: event.target.value }));
  const chooseFile = (next) => {
    if (!next) return;
    if (next.size > 50 * 1024 * 1024)
      return setStatus((s) => ({
        ...s,
        error: "Files must be 50 MB or smaller.",
      }));
    if (!allowed.test(next.name))
      return setStatus((s) => ({
        ...s,
        error:
          "Choose a PDF, document, presentation, spreadsheet, image, or archive.",
      }));
    setFile(next);
    setStatus((s) => ({ ...s, error: "" }));
  };
  const submit = async (event) => {
    event.preventDefault();
    if (!file)
      return setStatus({
        loading: false,
        success: false,
        error: "Choose a file to upload.",
      });
    setStatus({ loading: true, success: false, error: "" });
    try {
      await uploadResource(form, file);
      setStatus({ loading: false, success: true, error: "" });
    } catch (error) {
      setStatus({
        loading: false,
        success: false,
        error: error.message || "Upload failed.",
      });
    }
  };
  if (!isAuthenticated())
    return (
      <div className="page-narrow page">
        <div className="state card">
          <div>
            <AlertCircle className="muted" size={38} />
            <h1>Sign in to upload</h1>
            <p>
              Your account connects each contribution to its moderation status.
            </p>
            <button
              className="btn btn-primary"
              onClick={() => navigate("/login")}
            >
              Sign in
            </button>
          </div>
        </div>
      </div>
    );
  if (!user?.isVerified)
    return (
      <div className="page-narrow page">
        <div className="state card">
          <div>
            <AlertCircle className="muted" size={38} />
            <h1>Verify your email first</h1>
            <p>
              Only verified students can publish resources or join community
              conversations.
            </p>
            <button
              className="btn btn-secondary"
              onClick={() => navigate("/profile-settings")}
            >
              Open profile
            </button>
          </div>
        </div>
      </div>
    );
  if (status.success)
    return (
      <div className="page-narrow page">
        <div className="state card">
          <div>
            <div className="state-visual">
              <CheckCircle2 size={36} />
            </div>
            <h1>Upload received</h1>
            <p>
              {user.role === "admin"
                ? "The resource is approved and available now."
                : "It is now waiting for moderator review. You can track it from My uploads."}
            </p>
            <div className="cluster" style={{ justifyContent: "center" }}>
              <button
                className="btn btn-primary"
                onClick={() => navigate("/my-posts")}
              >
                View my uploads
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => navigate("/dashboard")}
              >
                Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  return (
    <div className="page-narrow page">
      <div className="page-header">
        <div>
          <span className="eyebrow">Contribute to UniBro</span>
          <h1 className="page-title">Upload a resource</h1>
          <p className="page-copy">
            Add accurate context so other students can find it quickly.
          </p>
        </div>
      </div>
      <form className="card card-pad stack" onSubmit={submit} noValidate>
        {status.error && (
          <div className="notice notice-error" role="alert">
            <AlertCircle size={18} />
            {status.error}
          </div>
        )}
        <div
          className={`dropzone${dragging ? " active" : ""}`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            chooseFile(e.dataTransfer.files[0]);
          }}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
          }}
          role="button"
          tabIndex={0}
          aria-label="Choose resource file"
        >
          <input
            ref={inputRef}
            type="file"
            hidden
            onChange={(e) => chooseFile(e.target.files[0])}
          />
          {file ? (
            <div>
              <File size={34} />
              <strong style={{ display: "block", marginTop: 10 }}>
                {file.name}
              </strong>
              <span className="muted small">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </span>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                style={{ margin: "8px auto 0" }}
                onClick={(e) => {
                  e.stopPropagation();
                  setFile(null);
                }}
              >
                <X size={15} /> Remove
              </button>
            </div>
          ) : (
            <div>
              <UploadCloud size={36} />
              <strong style={{ display: "block", marginTop: 10 }}>
                Drop a file here or browse
              </strong>
              <span className="muted small">
                Supported study files up to 50 MB
              </span>
            </div>
          )}
        </div>
        <div className="form-grid">
          <div className="field">
            <label htmlFor="title">Title</label>
            <input
              id="title"
              name="title"
              className="input"
              required
              minLength={2}
              maxLength={200}
              value={form.title}
              onChange={change}
            />
          </div>
          <div className="field">
            <label htmlFor="courseName">Course or subject</label>
            <input
              id="courseName"
              name="courseName"
              className="input"
              required
              minLength={2}
              maxLength={150}
              value={form.courseName}
              onChange={change}
            />
          </div>
          <div className="field form-full">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              name="description"
              className="textarea"
              required
              minLength={10}
              maxLength={3000}
              value={form.description}
              onChange={change}
            />
          </div>
          <div className="field">
            <label htmlFor="resourceType">Resource type</label>
            <select
              id="resourceType"
              name="resourceType"
              className="select"
              value={form.resourceType}
              onChange={change}
            >
              {types.map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="department">Department</label>
            <select
              id="department"
              name="department"
              className="select"
              required
              value={form.department}
              onChange={change}
            >
              <option value="">Choose department</option>
              {departments.map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="semester">Semester</label>
            <select
              id="semester"
              name="semester"
              className="select"
              required
              value={form.semester}
              onChange={change}
            >
              <option value="">Choose semester</option>
              {[1, 2, 3, 4, 5, 6, 7, 8].map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="section">Section</label>
            <input
              id="section"
              name="section"
              className="input"
              required
              maxLength={30}
              value={form.section}
              onChange={change}
              placeholder="e.g. A"
            />
          </div>
          <div className="field">
            <label htmlFor="batch">Batch</label>
            <input
              id="batch"
              name="batch"
              className="input"
              required
              maxLength={30}
              value={form.batch}
              onChange={change}
              placeholder="e.g. 2023"
            />
          </div>
          <div className="field">
            <label htmlFor="year">Academic year</label>
            <input
              id="year"
              name="year"
              type="number"
              min="2000"
              max={new Date().getFullYear() + 1}
              className="input"
              required
              value={form.year}
              onChange={change}
            />
          </div>
          <div className="field">
            <label htmlFor="pages">Pages (optional)</label>
            <input
              id="pages"
              name="pages"
              type="number"
              min="0"
              max="100000"
              className="input"
              value={form.pages}
              onChange={change}
            />
          </div>
        </div>
        <div className="split">
          <span className="muted small">
            Uploads are scanned and moderated before publication.
          </span>
          <button className="btn btn-primary" disabled={status.loading}>
            {status.loading ? "Uploading securely…" : "Submit resource"}
          </button>
        </div>
      </form>
    </div>
  );
}
