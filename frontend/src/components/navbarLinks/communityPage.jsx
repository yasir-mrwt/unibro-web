import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  BookOpen,
  LockKeyhole,
  MessageCircle,
  ShieldCheck,
} from "lucide-react";
import ChatPanel from "../chat/ChatPanel";
import { useTheme } from "../ThemeContext";
import { getStoredUser, isAuthenticated } from "../../services/authService";

const readContext = () => {
  try {
    return JSON.parse(localStorage.getItem("dashboardData")) || {};
  } catch {
    return {};
  }
};
export default function Community() {
  const location = useLocation();
  const navigate = useNavigate();
  const { darkMode } = useTheme();
  const user = getStoredUser();
  const saved = readContext();
  const department = location.state?.department || saved.department;
  const semester = location.state?.semester || saved.semester;
  const name = department?.name || department;
  if (!isAuthenticated())
    return (
      <div className="page-narrow page">
        <div className="state card">
          <div>
            <LockKeyhole className="muted" size={38} />
            <h1>Sign in to join the community</h1>
            <p>
              Department chat is available to authenticated students, with
              posting reserved for verified accounts.
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
  if (!name || !semester)
    return (
      <div className="page-narrow page">
        <div className="state card">
          <div>
            <BookOpen className="muted" size={38} />
            <h1>Choose your study context</h1>
            <p>
              Your community room follows your selected department and semester.
            </p>
            <button
              className="btn btn-primary"
              onClick={() => navigate("/select-department")}
            >
              Choose context
            </button>
          </div>
        </div>
      </div>
    );
  return (
    <div className="container page">
      <div className="page-header">
        <div>
          <span className="eyebrow">Academic community</span>
          <h1 className="page-title">
            {name} · Semester {semester}
          </h1>
          <p className="page-copy">
            Ask a focused question, compare study approaches, and keep the
            conversation useful.
          </p>
        </div>
        <span
          className={`badge ${user?.isVerified ? "badge-success" : "badge-warning"}`}
        >
          {user?.isVerified ? (
            <ShieldCheck size={14} />
          ) : (
            <LockKeyhole size={14} />
          )}
          {user?.isVerified ? "Verified member" : "Read only"}
        </span>
      </div>
      <div className="browser-layout">
        <section>
          <ChatPanel
            darkMode={darkMode}
            department={department}
            semester={semester}
          />
        </section>
        <aside className="card card-pad stack">
          <div>
            <span className="icon-box accent">
              <MessageCircle size={20} />
            </span>
            <h2 className="section-title" style={{ marginTop: 16 }}>
              Room guidelines
            </h2>
          </div>
          <div className="stack small">
            <p>
              <strong>Keep it academic.</strong>
              <br />
              <span className="muted">
                Use this room for courses, resources, and university help.
              </span>
            </p>
            <p>
              <strong>Be constructive.</strong>
              <br />
              <span className="muted">
                Challenge ideas respectfully and help others learn.
              </span>
            </p>
            <p>
              <strong>Protect privacy.</strong>
              <br />
              <span className="muted">
                Do not post private contact information or copied messages.
              </span>
            </p>
            <p>
              <strong>Credit your sources.</strong>
              <br />
              <span className="muted">
                Avoid plagiarism and copyrighted uploads you cannot share.
              </span>
            </p>
          </div>
          <button
            className="btn btn-secondary"
            onClick={() => navigate("/select-department")}
          >
            Change community
          </button>
        </aside>
      </div>
    </div>
  );
}
