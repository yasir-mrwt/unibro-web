import React from "react";
import { ArrowLeft, Building2 } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

const storedDepartment = () => {
  try {
    return JSON.parse(localStorage.getItem("selectedDepartment"));
  } catch {
    return null;
  }
};

export default function SemesterSelection() {
  const navigate = useNavigate();
  const location = useLocation();
  const department = location.state?.department || storedDepartment();
  const choose = (semester) => {
    const context = { department, semester };
    localStorage.setItem("dashboardData", JSON.stringify(context));
    navigate("/dashboard", { state: context });
  };
  if (!department)
    return (
      <div className="page-narrow page">
        <div className="state card">
          <div>
            <Building2 className="muted" size={36} />
            <h1>Choose a department first</h1>
            <p>A semester needs a department context.</p>
            <button
              className="btn btn-primary"
              onClick={() => navigate("/select-department")}
            >
              Choose department
            </button>
          </div>
        </div>
      </div>
    );
  return (
    <div className="container page">
      <div className="page-header">
        <div>
          <span className="eyebrow">Step 2 of 2</span>
          <h1 className="page-title">Choose your semester</h1>
          <div className="context-pills">
            <span className="badge badge-brand">
              <Building2 size={14} /> {department.name || department}
            </span>
            <span className="badge">Choose one to continue</span>
          </div>
        </div>
        <button
          className="btn btn-ghost"
          onClick={() => navigate("/select-department")}
        >
          <ArrowLeft size={17} /> Departments
        </button>
      </div>
      <div className="semester-grid">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((semester) => (
          <button
            className="selection-card semester-card card-interactive"
            key={semester}
            onClick={() => choose(semester)}
          >
            <span>
              <span className="semester-number">{semester}</span>
              <strong style={{ display: "block", marginTop: 9 }}>
                Semester {semester}
              </strong>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
