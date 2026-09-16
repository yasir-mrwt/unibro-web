import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  FileText,
  MessageCircle,
  UploadCloud,
} from "lucide-react";
import { getResources } from "../services/resourceService";
import { EmptyState, ErrorState, LoadingState } from "../components/ui/States";

const flatten = (groups = {}) => Object.values(groups).flat();
const formatDate = (value) =>
  value
    ? new Intl.DateTimeFormat(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(new Date(value))
    : "Recently";

export default function Home() {
  const navigate = useNavigate();
  const [state, setState] = useState({
    loading: true,
    error: "",
    resources: [],
  });
  const load = async () => {
    setState((current) => ({ ...current, loading: true, error: "" }));
    try {
      const data = await getResources();
      setState({
        loading: false,
        error: "",
        resources: flatten(data.resources).slice(0, 4),
      });
    } catch (error) {
      setState({ loading: false, error: error.message, resources: [] });
    }
  };
  useEffect(() => {
    load();
  }, []);
  const openResource = (resource) =>
    navigate("/resource-details", {
      state: {
        resourceType: resource.resourceType,
        department: resource.department,
        semester: resource.semester,
        selectedResourceId: resource._id,
      },
    });

  return (
    <>
      <div>
        <section className="hero">
          <div className="container hero-grid">
            <div>
              <span className="eyebrow">Your digital campus workspace</span>
              <h1>Everything you need for your semester.</h1>
              <p>
                Find notes, assignments, past papers and projects shared by your
                campus community—then contribute what helped you learn.
              </p>
              <div className="hero-actions">
                <Link to="/select-department" className="btn btn-primary">
                  Explore resources <ArrowRight size={18} />
                </Link>
                <Link to="/upload-modal" className="btn btn-secondary">
                  <UploadCloud size={18} /> Upload a resource
                </Link>
              </div>
            </div>
            <div
              className="campus-visual"
              role="img"
              aria-label="Animated preview of a student resource workspace"
            >
              <div className="motion-note one">New notes</div>
              <div className="motion-note two">Study together</div>
              <div className="campus-board">
                <div className="campus-board-row">
                  <span className="campus-dot" />
                  <span className="campus-line" />
                  <span className="campus-line" />
                </div>
                <div className="campus-board-row">
                  <span className="campus-dot" />
                  <span className="campus-line" />
                  <span className="campus-line" />
                </div>
                <div className="campus-board-row">
                  <span className="campus-dot" />
                  <span className="campus-line" />
                  <span className="campus-line" />
                </div>
                <div className="campus-board-row">
                  <span className="campus-dot" />
                  <span className="campus-line" />
                  <span className="campus-line" />
                </div>
              </div>
            </div>
          </div>
        </section>
        <section className="home-section">
          <div className="container">
            <span className="eyebrow">
              A shorter path to the right material
            </span>
            <h2 className="section-title">
              From degree to document in three steps
            </h2>
            <div className="steps-grid">
              {[
                [
                  "01",
                  "Choose your department",
                  "Start with the part of campus that matters to you.",
                ],
                [
                  "02",
                  "Set your semester",
                  "Keep every result relevant to your current courses.",
                ],
                [
                  "03",
                  "Open a resource",
                  "Preview, download, or share useful study material.",
                ],
              ].map(([n, t, d]) => (
                <article className="card card-pad step-card" key={n}>
                  <span className="step-number">{n}</span>
                  <h3>{t}</h3>
                  <p>{d}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
        <section className="home-section">
          <div className="container">
            <div className="page-header">
              <div>
                <span className="eyebrow">Recently shared</span>
                <h2 className="section-title">
                  Fresh from the student community
                </h2>
              </div>
              <Link to="/select-department" className="btn btn-ghost">
                Browse all <ArrowRight size={17} />
              </Link>
            </div>
            {state.loading ? (
              <LoadingState label="Loading recent resources" rows={4} />
            ) : state.error ? (
              <ErrorState message={state.error} onRetry={load} />
            ) : state.resources.length === 0 ? (
              <EmptyState
                title="No resources yet"
                message="The library is ready for its first approved contribution."
                action={
                  <Link className="btn btn-primary" to="/upload-modal">
                    Share a resource
                  </Link>
                }
              />
            ) : (
              <div className="resource-list">
                {state.resources.map((resource) => (
                  <article
                    className="resource-row card-interactive"
                    key={resource._id}
                  >
                    <span className="icon-box">
                      <FileText size={20} />
                    </span>
                    <div>
                      <h3>{resource.title}</h3>
                      <div className="resource-meta">
                        <span>
                          <BookOpen size={13} />
                          {resource.courseName}
                        </span>
                        <span>{resource.resourceType}</span>
                        <span>
                          <CalendarDays size={13} />
                          {formatDate(resource.createdAt)}
                        </span>
                      </div>
                    </div>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => openResource(resource)}
                    >
                      View
                    </button>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>
        <section className="home-section">
          <div className="container feature-grid">
            <article className="card card-pad">
              <span className="icon-box accent">
                <MessageCircle size={20} />
              </span>
              <h2 className="section-title" style={{ marginTop: 18 }}>
                A focused student community
              </h2>
              <p className="page-copy">
                Talk with verified students in your department and semester
                without the noise of a public social network.
              </p>
              <Link
                to="/community"
                className="btn btn-ghost"
                style={{ marginTop: 14 }}
              >
                Open community <ArrowRight size={17} />
              </Link>
            </article>
            <article className="cta-band" style={{ gridColumn: "span 2" }}>
              <div>
                <span className="eyebrow">Pass it forward</span>
                <h2 className="section-title" style={{ marginTop: 6 }}>
                  Your best notes can unblock someone else.
                </h2>
                <p className="page-copy">
                  Upload once, follow moderation status, and keep useful
                  material available for the next student.
                </p>
              </div>
              <Link to="/upload-modal" className="btn btn-primary">
                <UploadCloud size={18} /> Contribute
              </Link>
            </article>
          </div>
        </section>
      </div>
      <footer className="footer">
        <div className="container footer-inner">
          <span>© {new Date().getFullYear()} UniBro</span>
          <span>Built for focused study and useful sharing.</span>
        </div>
      </footer>
    </>
  );
}
