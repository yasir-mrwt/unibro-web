import React, { useCallback, useEffect, useState } from "react";
import { Edit, Mail, MapPin, Plus, Search, Trash2, X } from "lucide-react";
import { API_URL } from "../../services/config";
import { getAuthToken, getStoredUser } from "../../services/authService";
import { EmptyState, ErrorState, LoadingState } from "../ui/States";
import { useToast } from "../ui/ToastContext";
import AddEditStaffModal from "./AddEditStaffModal";

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
          <div className="resource-list">
            {staff.map((person) => (
              <article className="resource-row" key={person._id}>
                <span className="icon-box">
                  {person.name
                    .split(" ")
                    .map((part) => part[0])
                    .slice(0, 2)
                    .join("")}
                </span>
                <div>
                  <h3>{person.name}</h3>
                  <div className="resource-meta">
                    <span>{person.qualification}</span>
                    <span>{person.department}</span>
                    <span>
                      <MapPin size={13} />
                      {person.office}
                    </span>
                    <span>{person.courses?.slice(0, 2).join(", ")}</span>
                  </div>
                </div>
                <div className="cluster">
                  <a
                    className="btn btn-secondary btn-sm"
                    href={`mailto:${person.email}`}
                  >
                    <Mail size={15} /> Email
                  </a>
                  {isAdmin && (
                    <>
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
                    </>
                  )}
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
