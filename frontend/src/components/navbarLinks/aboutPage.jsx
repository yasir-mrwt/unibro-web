import React from "react";
import {
  BookOpen,
  MessageCircle,
  ShieldCheck,
  UploadCloud,
} from "lucide-react";
import { Link } from "react-router-dom";
export default function AboutPage() {
  return (
    <div className="container page">
      <div className="page-header">
        <div>
          <span className="eyebrow">About UniBro</span>
          <h1 className="page-title">A useful layer for student life.</h1>
          <p className="page-copy">
            UniBro connects course material, verified semester conversations,
            and faculty information in one focused campus workspace.
          </p>
        </div>
      </div>
      <div className="feature-grid">
        {[
          [
            BookOpen,
            "Find what matters",
            "Browse approved material by department, semester, and resource type.",
          ],
          [
            UploadCloud,
            "Share responsibly",
            "Contribute study files and track each moderation decision.",
          ],
          [
            MessageCircle,
            "Learn together",
            "Talk in authenticated rooms tied to your academic context.",
          ],
          [
            ShieldCheck,
            "Built with guardrails",
            "Verified participation, protected uploads, and role-based administration.",
          ],
        ].map(([Icon, title, copy]) => (
          <article className="card card-pad" key={title}>
            <span className="icon-box">
              {React.createElement(Icon, { size: 20 })}
            </span>
            <h2 className="section-title" style={{ marginTop: 16 }}>
              {title}
            </h2>
            <p className="page-copy">{copy}</p>
          </article>
        ))}
      </div>
      <div className="cta-band" style={{ marginTop: 22 }}>
        <div>
          <h2 className="section-title">Start with your department</h2>
          <p className="page-copy">
            Build a resource view that matches your current semester.
          </p>
        </div>
        <Link className="btn btn-primary" to="/select-department">
          Explore UniBro
        </Link>
      </div>
    </div>
  );
}
