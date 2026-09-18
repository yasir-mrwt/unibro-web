import React, { useCallback, useEffect, useState } from "react";
import {
  BookOpen,
  Clock3,
  Edit,
  Mail,
  MapPin,
  Phone,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { API_URL } from "../../services/config";
import { getAuthToken, getStoredUser } from "../../services/authService";
import { EmptyState, ErrorState, LoadingState } from "../ui/States";
import { useToast } from "../ui/ToastContext";
import AddEditStaffModal from "./AddEditStaffModal";

const LEGACY_PLACEHOLDER =
  "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop";

const initialsFor = (name = "") =>
  name
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase() || "U";

function StaffPortrait({ person }) {
  const [failed, setFailed] = useState(false);
  const hasImage = Boolean(
    person.image?.trim() && person.image.trim() !== LEGACY_PLACEHOLDER,
  );

  if (!hasImage || failed) {
    return (
      <div
        className="staff-avatar-fallback"
        role="img"
        aria-label={`${person.name} profile image unavailable`}
      >
        <span>{initialsFor(person.name)}</span>
      </div>
    );
  }

  return (
    <img
      className="staff-photo"
      src={person.image}
      alt={`${person.name} profile`}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}

export default function StaffDirectory() {
  const { notify } = useToast();
  const isAdmin = getStoredUser()?.role === "admin";
  const [query, setQuery] = useState("");
  const [department, setDepartment] = useState("");
  const [departments, setDepartments] = useState([]);
  const [page, setPage] = useState(1);
  const [staff, setStaff] = useState([]);
  const [pagination, setPagination] = useState({
    totalPages: 1,
    totalStaff: 0,
  });
  const [state, setState] = useState({ loading: true, error: "" });
  const [editing, setEditing] = useState(undefined);
  const [deleteTarget, setDeleteTarget] = useState(null);
  useEffect(() => {
    fetch(`${API_URL}/api/staff/departments`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setDepartments(data.data);
      })
      .catch(() => {});
  }, []);
  const load = useCallback(async () => {
    setState({ loading: true, error: "" });
    try {
      const params = new URLSearchParams({
        page,
        limit: "12",
        search: query,
        department,
      });
      const response = await fetch(`${API_URL}/api/staff?${params}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Unable to load staff");
      setStaff(data.data || []);
      setPagination(data.pagination || { totalPages: 1, totalStaff: 0 });
      setState({ loading: false, error: "" });
    } catch (error) {
      setState({ loading: false, error: error.message });
    }
  }, [page, query, department]);
  useEffect(() => {
    const timer = setTimeout(load, 250);
    return () => clearTimeout(timer);
  }, [load]);
  const remove = async () => {
    try {
      const response = await fetch(`${API_URL}/api/staff/${deleteTarget._id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${getAuthToken()}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Delete failed");
      notify("Staff member removed.");
      setDeleteTarget(null);
      load();
    } catch (error) {
      notify(error.message, "error");
    }
  };
  return (
    <div className="container page">
      <div className="page-header">
        <div>
          <span className="eyebrow">Faculty and support</span>
          <h1 className="page-title">Staff directory</h1>
          <p className="page-copy">
            Find instructors by name, department, course, or qualification.
          </p>
        </div>
        {isAdmin && (
          <button className="btn btn-primary" onClick={() => setEditing(null)}>
            <Plus size={17} /> Add staff
          </button>
        )}
      </div>
      <div className="toolbar staff-toolbar">
        <div className="input-wrap">
          <Search />
          <input
            className="input"
            type="search"
            placeholder="Search name, course, or qualification"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <select
          className="select"
          value={department}
          onChange={(e) => {
            setDepartment(e.target.value);
            setPage(1);
          }}
          aria-label="Filter staff by department"
        >
          <option value="">All departments</option>
          {departments.map((value) => (
            <option key={value}>{value}</option>
          ))}
        </select>
      </div>
      {state.loading ? (
        <LoadingState label="Loading staff" rows={5} />
      ) : state.error ? (
        <ErrorState message={state.error} onRetry={load} />
      ) : !staff.length ? (
        <EmptyState
          title="No staff found"
          message="Try a different name or department."
        />
      ) : (
        <>
          <div className="staff-directory-grid">
            {staff.map((person) => (
              <article className="staff-card" key={person._id}>
                <div className="staff-card-main">
                  <div className="staff-portrait">
                    <StaffPortrait
                      key={person.image || "fallback"}
                      person={person}
                    />
                  </div>
                  <div className="staff-identity">
                    <span className="staff-department">{person.department}</span>
                    <h2>{person.name}</h2>
                    <p className="staff-designation">{person.qualification}</p>
                  </div>
                </div>
                <dl className="staff-details">
                  <div>
                    <dt><MapPin size={15} /> Office</dt>
                    <dd>{person.office}</dd>
                  </div>
                  <div>
                    <dt><Clock3 size={15} /> Counselling</dt>
                    <dd>{person.counsellingHours}</dd>
                  </div>
                  {person.courses?.length > 0 && (
                    <div className="staff-detail-wide">
                      <dt><BookOpen size={15} /> Courses</dt>
                      <dd>{person.courses.slice(0, 3).join(", ")}</dd>
                    </div>
                  )}
                </dl>
                <div className="staff-card-actions">
                  <div className="staff-contact-actions">
                    <a href={`mailto:${person.email}`}>
                      <Mail size={15} /> <span>{person.email}</span>
                    </a>
                    {person.phoneNumber && (
                      <a href={`tel:${person.phoneNumber}`}>
                        <Phone size={15} /> <span>{person.phoneNumber}</span>
                      </a>
                    )}
                  </div>
                  {isAdmin && <div className="staff-admin-actions">
                    <button
                      className="btn btn-ghost btn-icon btn-sm"
                      onClick={() => setEditing(person)}
                      aria-label={`Edit ${person.name}`}
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      className="btn btn-danger btn-icon btn-sm"
                      onClick={() => setDeleteTarget(person)}
                      aria-label={`Delete ${person.name}`}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>}
                </div>
              </article>
            ))}
          </div>
          <div className="split" style={{ marginTop: 18 }}>
            <span className="muted small">
              {pagination.totalStaff} staff members
            </span>
            <div className="cluster">
              <button
                className="btn btn-secondary btn-sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </button>
              <span className="small">
                Page {page} of {pagination.totalPages || 1}
              </span>
              <button
                className="btn btn-secondary btn-sm"
                disabled={page >= pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
      {editing !== undefined && (
        <AddEditStaffModal
          isOpen
          onClose={() => setEditing(undefined)}
          staff={editing}
          onSuccess={() => {
            setEditing(undefined);
            load();
          }}
          departments={departments}
        />
      )}
      {deleteTarget && (
        <div className="dialog-backdrop">
          <div
            className="dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="staff-delete-title"
          >
            <div className="dialog-head">
              <h2 className="section-title" id="staff-delete-title">
                Remove staff member?
              </h2>
              <button
                className="btn btn-ghost btn-icon"
                onClick={() => setDeleteTarget(null)}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>
            <div className="dialog-body stack">
              <p className="page-copy">
                This permanently removes <strong>{deleteTarget.name}</strong>{" "}
                from the directory.
              </p>
              <div className="cluster" style={{ justifyContent: "flex-end" }}>
                <button
                  className="btn btn-secondary"
                  onClick={() => setDeleteTarget(null)}
                >
                  Cancel
                </button>
                <button className="btn btn-danger" onClick={remove}>
                  Remove
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
