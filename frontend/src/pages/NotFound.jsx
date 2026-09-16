import React from "react";
import { Compass } from "lucide-react";
import { Link } from "react-router-dom";
export default function NotFound() {
  return (
    <div className="page-narrow page">
      <div className="card state">
        <div>
          <div className="state-visual">
            <Compass size={36} />
          </div>
          <span className="eyebrow">404</span>
          <h1>That page isn’t on campus</h1>
          <p>The link may be outdated, or the page may have moved.</p>
          <div className="cluster" style={{ justifyContent: "center" }}>
            <Link className="btn btn-primary" to="/">
              Return home
            </Link>
            <Link className="btn btn-secondary" to="/select-department">
              Browse resources
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
