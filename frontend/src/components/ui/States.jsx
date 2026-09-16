import React from "react";
import { AlertTriangle, Inbox, LoaderCircle } from "lucide-react";

export function LoadingState({ label = "Loading…", rows = 3 }) {
  return (
    <div className="stack" role="status" aria-label={label}>
      {Array.from({ length: rows }).map((_, index) => (
        <div className="skeleton" style={{ height: 74 }} key={index} />
      ))}
    </div>
  );
}

export function EmptyState({ title, message, action, icon: Icon = Inbox }) {
  return (
    <div className="state card">
      <div>
        <div className="state-visual" aria-hidden="true">
          {React.createElement(Icon, { size: 34 })}
        </div>
        <h2>{title}</h2>
        <p>{message}</p>
        {action}
      </div>
    </div>
  );
}

export function ErrorState({ message, onRetry }) {
  return (
    <div className="state card">
      <div>
        <div className="state-visual" aria-hidden="true">
          <AlertTriangle size={34} />
        </div>
        <h2>Unable to load this page</h2>
        <p>{message || "Something went wrong. Please try again."}</p>
        {onRetry && (
          <button className="btn btn-primary" onClick={onRetry}>
            <LoaderCircle size={17} /> Try again
          </button>
        )}
      </div>
    </div>
  );
}

export function StatusBadge({ status }) {
  const normalized = String(status || "unknown").toLowerCase();
  return (
    <span className={`badge badge-${normalized}`}>
      {normalized.charAt(0).toUpperCase() + normalized.slice(1)}
    </span>
  );
}
