import React, { useEffect, useRef, useState } from "react";
import { CheckCircle2, LoaderCircle, AlertCircle } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { API_URL } from "../services/config";
import { storeAuthData } from "../services/authService";
export default function AuthSuccess({ onLoginSuccess }) {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const once = useRef(false);
  const [state, setState] = useState({
    status: "loading",
    message: "Securely completing your Google sign-in.",
  });
  useEffect(() => {
    if (once.current) return;
    once.current = true;
    (async () => {
      try {
        const hash = new URLSearchParams(window.location.hash.slice(1));
        const token = hash.get("token") || params.get("token");
        window.history.replaceState({}, document.title, "/auth/success");
        if (!token) throw new Error("No authentication token was received.");
        const response = await fetch(`${API_URL}/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();
        if (!response.ok || !data.user)
          throw new Error(data.message || "Authentication failed.");
        storeAuthData({ token, user: data.user });
        onLoginSuccess?.(data.user);
        setState({
          status: "success",
          message: "You’re signed in. Taking you to UniBro…",
        });
        setTimeout(() => navigate("/", { replace: true }), 900);
      } catch (error) {
        setState({ status: "error", message: error.message });
      }
    })();
  }, [params, navigate, onLoginSuccess]);
  return (
    <div className="page-narrow page">
      <div className="card state">
        <div>
          <div className="state-visual">
            {state.status === "loading" ? (
              <LoaderCircle size={36} className="animate-spin" />
            ) : state.status === "success" ? (
              <CheckCircle2 size={36} />
            ) : (
              <AlertCircle size={36} />
            )}
          </div>
          <h1>
            {state.status === "loading"
              ? "Completing sign-in"
              : state.status === "success"
                ? "Signed in"
                : "Sign-in failed"}
          </h1>
          <p>{state.message}</p>
          {state.status === "error" && (
            <button
              className="btn btn-primary"
              onClick={() => navigate("/login")}
            >
              Try again
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
