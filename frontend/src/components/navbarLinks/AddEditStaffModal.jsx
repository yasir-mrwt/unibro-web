import React, { useEffect, useState } from "react";
import { AlertCircle, Plus, X } from "lucide-react";
import { API_URL } from "../../services/config";
import { getAuthToken } from "../../services/authService";
const blank = {
  name: "",
  email: "",
  department: "",
  qualification: "",
  office: "",
  counsellingHours: "",
  phoneNumber: "",
  bio: "",
  yearsOfExperience: "",
  courses: "",
  specialization: "",
};
export default function AddEditStaffModal({
  staff,
  onClose,
  onSuccess,
  departments,
}) {
  const [form, setForm] = useState(blank);
  const [image, setImage] = useState(null);
  const [state, setState] = useState({ loading: false, error: "" });
  useEffect(() => {
    if (staff)
      setForm({
        ...blank,
        ...staff,
        courses: (staff.courses || []).join(", "),
        specialization: (staff.specialization || []).join(", "),
      });
  }, [staff]);
  useEffect(() => {
    const key = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", key);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", key);
      document.body.style.overflow = "";
    };
  }, [onClose]);
  const change = (e) =>
    setForm((v) => ({ ...v, [e.target.name]: e.target.value }));
  const submit = async (e) => {
    e.preventDefault();
    setState({ loading: true, error: "" });
    try {
      const body = new FormData();
      Object.entries(form).forEach(([key, value]) => {
        if (key === "courses" || key === "specialization")
          body.append(
            key,
            JSON.stringify(
              String(value)
                .split(",")
                .map((item) => item.trim())
                .filter(Boolean),
            ),
          );
        else if (value !== "") body.append(key, value);
      });
      if (image) body.append("image", image);
      const response = await fetch(
        staff ? `${API_URL}/api/staff/${staff._id}` : `${API_URL}/api/staff`,
        {
          method: staff ? "PUT" : "POST",
          headers: { Authorization: `Bearer ${getAuthToken()}` },
          body,
        },
      );
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.message || "Unable to save staff member");
      onSuccess();
    } catch (error) {
      setState({ loading: false, error: error.message });
    }
  };
  return (
    <div
      className="dialog-backdrop"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="dialog"
        style={{ width: "min(720px,100%)" }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="staff-form-title"
      >
        <div className="dialog-head">
          <div>
            <span className="eyebrow">Directory management</span>
            <h2 className="section-title" id="staff-form-title">
              {staff ? "Edit staff member" : "Add staff member"}
            </h2>
          </div>
          <button
            className="btn btn-ghost btn-icon"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>
        <form className="dialog-body stack" onSubmit={submit}>
          {state.error && (
            <div className="notice notice-error" role="alert">
              <AlertCircle size={18} />
              {state.error}
            </div>
          )}
          <div className="form-grid">
            <div className="field">
              <label htmlFor="staff-name">Name</label>
              <input
                className="input"
                id="staff-name"
                name="name"
                required
                minLength={2}
                maxLength={100}
                value={form.name}
                onChange={change}
              />
            </div>
            <div className="field">
              <label htmlFor="staff-email">Email</label>
              <input
                className="input"
                id="staff-email"
                name="email"
                type="email"
                required
                value={form.email}
                onChange={change}
              />
            </div>
            <div className="field">
              <label htmlFor="staff-department">Department</label>
              <select
                className="select"
                id="staff-department"
                name="department"
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
              <label htmlFor="qualification">Qualification / designation</label>
              <input
                className="input"
                id="qualification"
                name="qualification"
                required
                value={form.qualification}
                onChange={change}
              />
            </div>
            <div className="field">
              <label htmlFor="office">Office</label>
              <input
                className="input"
                id="office"
                name="office"
                required
                value={form.office}
                onChange={change}
              />
            </div>
            <div className="field">
              <label htmlFor="hours">Counselling hours</label>
              <input
                className="input"
                id="hours"
                name="counsellingHours"
                required
                value={form.counsellingHours}
                onChange={change}
              />
            </div>
            <div className="field">
              <label htmlFor="phone">Phone (optional)</label>
              <input
                className="input"
                id="phone"
                name="phoneNumber"
                maxLength={30}
                value={form.phoneNumber}
                onChange={change}
              />
            </div>
            <div className="field">
              <label htmlFor="experience">Years of experience</label>
              <input
                className="input"
                id="experience"
                name="yearsOfExperience"
                type="number"
                min="0"
                max="80"
                value={form.yearsOfExperience}
                onChange={change}
              />
            </div>
            <div className="field form-full">
              <label htmlFor="courses">
                Courses <span className="muted">(comma separated)</span>
              </label>
              <input
                className="input"
                id="courses"
                name="courses"
                value={form.courses}
                onChange={change}
              />
            </div>
            <div className="field form-full">
              <label htmlFor="specialization">
                Specializations <span className="muted">(comma separated)</span>
              </label>
              <input
                className="input"
                id="specialization"
                name="specialization"
                value={form.specialization}
                onChange={change}
              />
            </div>
            <div className="field form-full">
              <label htmlFor="bio">Bio</label>
              <textarea
                className="textarea"
                id="bio"
                name="bio"
                maxLength={500}
                value={form.bio}
                onChange={change}
              />
            </div>
            <div className="field form-full">
              <label htmlFor="staff-image">Profile image (optional)</label>
              <input
                className="input"
                id="staff-image"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => setImage(e.target.files[0] || null)}
              />
              <span className="muted small">
                JPEG, PNG, or WebP up to 5 MB.
              </span>
            </div>
          </div>
          <div className="cluster" style={{ justifyContent: "flex-end" }}>
            <button
              className="btn btn-secondary"
              type="button"
              onClick={onClose}
            >
              Cancel
            </button>
            <button className="btn btn-primary" disabled={state.loading}>
              <Plus size={17} />
              {state.loading
                ? "Saving…"
                : staff
                  ? "Save changes"
                  : "Add staff member"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
