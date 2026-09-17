import React from "react";

export default function Brand({ light = false }) {
  return (
    <span className={`brand-lockup${light ? " brand-lockup-light" : ""}`}>
      <span className="brand-symbol" aria-hidden="true">
        <img src="/book.svg" alt="" />
      </span>
      <span className="brand-wordmark">
        Uni<span>Bro</span>
      </span>
    </span>
  );
}
