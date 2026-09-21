import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowDown,
  ArrowRight,
  Check,
  FileText,
  FolderOpen,
  MessageCircle,
  Search,
  ShieldCheck,
  UploadCloud,
  UsersRound,
} from "lucide-react";
import Brand from "../components/Brand";
import { getStoredUser } from "../services/authService";

const resourceTypes = [
  ["01", "Notes", "Lecture summaries and course notes"],
  ["02", "Assignments", "Briefs, references, and solved practice"],
  ["03", "Past papers", "Exam material organized by semester"],
  ["04", "Projects", "Reports, code, and project references"],
  ["05", "Presentations", "Slides from courses and seminars"],
  ["06", "Quizzes", "Short-form revision material"],
];

const previews = {
  Dashboard: {
    kicker: "Semester 4 · Computer Science",
    title: "Good afternoon. Pick up where you left off.",
    rows: ["Data structures notes", "Database systems", "Software design"],
  },
  Resources: {
    kicker: "Resource library",
    title: "Find the right file without digging through chats.",
    rows: ["Course · Type · Year", "Preview before download", "Sort by newest or useful"],
  },
  Upload: {
    kicker: "Share with context",
    title: "Add the details that make a file useful later.",
    rows: ["Department and semester", "Course and resource type", "Review before publishing"],
  },
  Community: {
    kicker: "Semester room",
    title: "A calmer place for course questions.",
    rows: ["Authenticated classmates", "Live presence and replies", "Messages stay with the room"],
  },
};

export default function Home() {
  const user = getStoredUser();
  const [preview, setPreview] = useState("Dashboard");

  useEffect(() => {
    if (!window.location.hash) return;
    requestAnimationFrame(() =>
      document.querySelector(window.location.hash)?.scrollIntoView(),
    );
  }, []);

  return (
    <>
      <div className="marketing-page">
        <section className="editorial-hero">
          <div className="container editorial-hero-grid">
            <div className="hero-copy">
              <p className="chapter-label">Built around the way semesters actually work</p>
              <h1>Stop studying from <em>ten different chats.</em></h1>
              <p className="hero-deck">
                UniBro gives every department and semester one dependable place
                for notes, assignments, past papers, projects, faculty details,
                and the conversations around them.
              </p>
              <div className="hero-actions">
                <Link
                  to={user ? "/dashboard" : "/"}
                  state={user ? undefined : { showRegister: true }}
                  className="btn btn-primary btn-lg"
                >
                  {user ? "Open your dashboard" : "Set up your semester"}
                  <ArrowRight size={18} />
                </Link>
                <a href="#how-it-works" className="text-link">
                  See how it works <ArrowDown size={16} />
                </a>
              </div>
              <p className="hero-footnote">Organized by department. Narrowed by semester. Reviewed before it is shared.</p>
            </div>

            <div className="study-composition" aria-label="An animated stack of organized university materials">
              <span className="composition-grid" />
              <div className="semester-index"><span>DEPARTMENT</span><strong>Computer Science</strong><small>Semester 4</small></div>
              <article className="paper-sheet paper-back"><span>PAST PAPER</span><strong>Database Systems</strong><small>Final examination</small></article>
              <article className="paper-sheet paper-middle"><span>ASSIGNMENT</span><strong>Data Structures</strong><small>Trees and graphs</small></article>
              <article className="paper-sheet paper-front">
                <div className="paper-heading"><FileText size={18} /><span>COURSE NOTES</span></div>
                <h2>Software Design</h2>
                <div className="paper-lines"><i /><i /><i /><i /></div>
                <div className="paper-footer"><span>PDF</span><span>Reviewed</span></div>
              </article>
              <div className="community-slip"><span className="live-dot" /> Semester room active</div>
            </div>
          </div>
        </section>

        <section className="problem-section" id="why-unibro">
          <div className="container problem-layout">
            <div className="section-intro"><p className="chapter-label">Why UniBro exists</p><h2>Good material is everywhere. Finding it is the problem.</h2></div>
            <div className="scatter-map" aria-label="Scattered study sources becoming an organized library">
              <span className="source source-a">Class group</span><span className="source source-b">A senior’s drive</span><span className="source source-c">Saved messages</span><span className="source source-d">A classmate</span><span className="source source-e">Personal folders</span>
              <div className="map-path" aria-hidden="true" />
              <div className="library-destination"><FolderOpen size={28} /><strong>One semester library</strong><small>Sorted, searchable, shared</small></div>
            </div>
            <p className="problem-note">UniBro keeps the context attached: which department, which semester, which course, and what kind of material it is. The next student does not have to start the search again.</p>
          </div>
        </section>

        <section className="process-section" id="how-it-works">
          <div className="container">
            <div className="section-intro horizontal"><div><p className="chapter-label">How it works</p><h2>Four decisions. Then the noise disappears.</h2></div><p>Start with your academic context, then use the library and community built around it.</p></div>
            <ol className="academic-path">
              {[
                ["01", "Department", "Choose your degree area once."],
                ["02", "Semester", "Narrow everything to the courses in front of you."],
                ["03", "Find or share", "Search the library or add a useful file with context."],
                ["04", "Learn and discuss", "Preview material and ask your semester room."],
              ].map(([number, title, text]) => (
                <li key={number}><span>{number}</span><div><h3>{title}</h3><p>{text}</p></div><ArrowRight aria-hidden="true" /></li>
              ))}
            </ol>
          </div>
        </section>

        <section className="library-section" id="what-you-get">
          <div className="container library-layout">
            <div className="library-title"><p className="chapter-label">The academic shelf</p><h2>What students can find</h2><p>Six useful formats, filed under the department and semester where they belong.</p><div className="shelf-mark"><Search size={19} /> Search by course, title, type, or year</div></div>
            <div className="resource-index">
              {resourceTypes.map(([number, title, text]) => <div className="resource-index-row" key={title}><span>{number}</span><strong>{title}</strong><p>{text}</p><ArrowRight size={17} /></div>)}
            </div>
          </div>
        </section>

        <section className="inside-section">
          <div className="container">
            <div className="section-intro horizontal"><div><p className="chapter-label">Inside UniBro</p><h2>A study workspace, not another feed.</h2></div><p>Every screen stays close to the work: find a file, understand its context, contribute, or ask a useful question.</p></div>
            <div className="product-stage">
              <div className="product-tabs" role="tablist" aria-label="Product previews">
                {Object.keys(previews).map((name) => <button key={name} role="tab" aria-selected={preview === name} onClick={() => setPreview(name)}>{name}</button>)}
              </div>
              <div className="product-window">
                <div className="window-chrome"><i /><i /><i /><span>unibro / {preview.toLowerCase()}</span></div>
                <div className="preview-sidebar"><Brand /><span>Dashboard</span><span>Resources</span><span>Community</span><span>Staff</span></div>
                <div className="preview-content"><p>{previews[preview].kicker}</p><h3>{previews[preview].title}</h3><div className="preview-search"><Search size={16} /> Search UniBro</div><div className="preview-rows">{previews[preview].rows.map((row, index) => <div key={row}><span>{String(index + 1).padStart(2, "0")}</span><strong>{row}</strong><ArrowRight size={15} /></div>)}</div></div>
              </div>
            </div>
          </div>
        </section>

        <section className="trust-section">
          <div className="container trust-layout">
            <div><p className="chapter-label">Contribution with care</p><h2>Share what helped. Keep the library trustworthy.</h2></div>
            <div className="review-flow">
              <div><UploadCloud /><span>01</span><strong>A student uploads</strong><p>The course, semester, and file details travel together.</p></div>
              <div><ShieldCheck /><span>02</span><strong>Moderation checks it</strong><p>Pending material is reviewed before it joins the public library.</p></div>
              <div><Check /><span>03</span><strong>Classmates can use it</strong><p>Approved resources become searchable and easy to preview.</p></div>
            </div>
          </div>
        </section>

        <section className="people-section">
          <div className="container people-grid">
            <article className="community-story"><MessageCircle size={28} /><p className="chapter-label">Community</p><h2>Questions stay close to the semester.</h2><p>Talk with authenticated students in the same department and semester. See who is present, reply in context, and reconnect without losing the room.</p></article>
            <article className="staff-story"><UsersRound size={28} /><p className="chapter-label">Faculty directory</p><h2>Find the people behind the courses.</h2><p>Search staff by department and see useful academic details without sorting through outdated group messages.</p></article>
          </div>
        </section>

        <section className="final-cta">
          <div className="container final-cta-inner">
            <div><span className="cta-note">NEXT SEMESTER</span><h2>Give your course material a place to belong.</h2></div>
            <div className="hero-actions"><Link to={user ? "/dashboard" : "/"} state={user ? undefined : { showRegister: true }} className="btn btn-primary btn-lg">{user ? "Open dashboard" : "Get started"}<ArrowRight size={18} /></Link>{!user && <Link to="/" state={{ showLogin: true }} className="btn btn-secondary btn-lg">Sign in</Link>}</div>
          </div>
        </section>
      </div>
      <footer className="brand-footer">
        <div className="container footer-grid"><div><Brand light /><p>Useful university material, organized around real academic context.</p></div><nav aria-label="Footer navigation"><a href="#how-it-works">How it works</a><a href="#what-you-get">What you get</a><Link to="/about">About</Link></nav><span>© {new Date().getFullYear()} UniBro. Created by <a href="https://yasirmarwat.site" target="_blank" rel="noopener">Yasir Marwat</a>.</span></div>
      </footer>
    </>
  );
}
