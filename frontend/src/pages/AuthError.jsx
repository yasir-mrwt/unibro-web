import React from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { loginWithGoogle } from "../services/authService";
export default function AuthError() {
  const navigate = useNavigate();
  return (
    <div className="page-narrow page">
      <div className="card state">
        <div>
          <div className="state-visual">
            <AlertCircle size={36} />
          </div>
          <h1>Google sign-in did not complete</h1>
          <p>No account changes were made. You can retry or return home.</p>
          <div className="cluster" style={{ justifyContent: "center" }}>
            <button className="btn btn-primary" onClick={loginWithGoogle}>
              <RefreshCw size={17} /> Try again
            </button>
            <button className="btn btn-secondary" onClick={() => navigate("/")}>
              Return home
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
