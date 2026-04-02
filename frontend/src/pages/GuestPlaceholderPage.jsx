import { Link } from "react-router-dom";

export function GuestPlaceholderPage() {
  return (
    <main className="app-shell">
      <div className="page-frame">
        <section className="surface page-transition">
          <div className="stack">
            <p className="eyebrow">Guest mode</p>
            <h2>Guest camera check-in is coming next.</h2>
            <p>
              The manager flow is ready first. This page will be replaced by the browser camera attendance
              experience in the next task.
            </p>
            <div className="action-row">
              <Link className="btn btn-primary" to="/">
                Back to start
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
