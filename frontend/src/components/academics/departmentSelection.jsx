import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Atom,
  Building2,
  Cpu,
  Factory,
  Search,
  Sprout,
  Wrench,
  Zap,
} from "lucide-react";

const departments = [
  ["Computer Science", "CS", Cpu],
  ["Electrical Engineering", "EE", Zap],
  ["Mechanical Engineering", "ME", Wrench],
  ["Industrial Engineering", "IE", Factory],
  ["Mechatronics Engineering", "MTE", Cpu],
  ["Agricultural Engineering", "AE", Sprout],
  ["Chemical Engineering", "CHE", Atom],
  ["Civil Engineering", "CE", Building2],
];

export default function DepartmentSelection() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const visible = useMemo(
    () =>
      departments.filter(([name]) =>
        name.toLowerCase().includes(query.toLowerCase()),
      ),
    [query],
  );
  const select = ([name, abbreviation]) => {
    const department = { name, abbreviation };
    localStorage.setItem("selectedDepartment", JSON.stringify(department));
    navigate("/select-semester", { state: { department } });
  };
  return (
    <div className="container page">
      <div className="page-header">
        <div>
          <span className="eyebrow">Step 1 of 2</span>
          <h1 className="page-title">Choose your department</h1>
          <p className="page-copy">
            We’ll use this to show resources and conversations relevant to your
            degree.
          </p>
        </div>
        <button className="btn btn-ghost" onClick={() => navigate(-1)}>
          <ArrowLeft size={17} /> Back
        </button>
      </div>
      <div className="input-wrap" style={{ maxWidth: 480, marginBottom: 22 }}>
        <Search />
        <input
          className="input"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search departments"
          aria-label="Search departments"
        />
      </div>
      {visible.length ? (
        <div className="selection-grid">
          {visible.map((department) => {
            const [name, abbreviation, Icon] = department;
            return (
              <button
                className="selection-card card-interactive"
                onClick={() => select(department)}
                key={name}
              >
                <span className="icon-box">
                  <Icon size={21} />
                </span>
                <h2>{name}</h2>
                <span className="muted small">
                  {abbreviation} · View semesters
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="state card">
          <div>
            <Search className="muted" size={34} />
            <h2>No department found</h2>
            <p>Try a broader search term.</p>
          </div>
        </div>
      )}
    </div>
  );
}
