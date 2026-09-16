import React, { useEffect, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, MailCheck } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { API_URL } from "../services/config";
import {
  resendVerificationEmail,
  updateStoredUser,
} from "../services/authService";
export default function VerifyEmail() {
  const { token } = useParams();
  const navigate = useNavigate();
  const once = useRef(false);
  const [state, setState] = useState({
    status: "loading",
    message: "Verifying your email…",
    expired: false,
  });
  const [resending, setResending] = useState(false);
  useEffect(() => {
    if (once.current) return;
    once.current = true;
    (async () => {
      try {
        const response = await fetch(
          `${API_URL}/api/auth/verify-email/${encodeURIComponent(token)}`,
        );
        const data = await response.json();
        if (!response.ok)
          throw Object.assign(
            new Error(data.message || "Verification failed."),
            { expired: data.expired },
          );
        updateStoredUser({ isVerified: true });
        window.dispatchEvent(new Event("userVerified"));
        setState({
          status: "success",
          message: data.message || "Your email is verified.",
          expired: false,
        });
      } catch (error) {
        setState({
          status: "error",
          message: error.message || "Verification failed.",
          expired: Boolean(error.expired),
        });
      }
    })();
  }, [token]);
  const resend = async () => {
    setResending(true);
    try {
      const data = await resendVerificationEmail();
      setState({
        status: "success",
        message: data.message || "A new verification email was sent.",
        expired: false,
      });
    } catch (error) {
      setState((s) => ({ ...s, message: error.message, status: "error" }));
    } finally {
      setResending(false);
    }
  };
  return (
    <div className="page-narrow page">
      <div className="card state">
        <div>
          <div className="state-visual">
            {state.status === "error" ? (
              <AlertCircle size={36} />
            ) : state.status === "success" ? (
              <CheckCircle2 size={36} />
            ) : (
              <MailCheck size={36} />
            )}
          </div>
          <h1>
            {state.status === "loading"
              ? "Verifying your email"
              : state.status === "success"
                ? "Email verified"
                : "Verification failed"}
          </h1>
          <p>{state.message}</p>
          <div className="cluster" style={{ justifyContent: "center" }}>
            {state.status === "success" && (
              <button className="btn btn-primary" onClick={() => navigate("/")}>
                Continue to UniBro
              </button>
            )}
            {state.status === "error" && state.expired && (
              <button
                className="btn btn-primary"
                disabled={resending}
                onClick={resend}
              >
                {resending ? "Sending…" : "Send a new link"}
              </button>
            )}
            {state.status === "error" && (
              <button
                className="btn btn-secondary"
                onClick={() => navigate("/login")}
              >
                Sign in
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
