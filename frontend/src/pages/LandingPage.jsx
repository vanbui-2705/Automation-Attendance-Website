import { Link } from "react-router-dom";

export function LandingPage() {
  return (
    <main className="app-shell">
      <div className="page-frame">
        <section className="hero-panel page-transition">
          <div className="hero-grid">
            <div className="stack">
              <p className="eyebrow">Local browser attendance</p>
              <h1>Choose how you want to enter the system.</h1>
              <p>
                Manager gets the secure roster and face-registration flow. Guest will become the browser
                camera check-in experience in the next step.
              </p>
              <div className="action-row">
                <Link className="btn btn-primary" to="/manager/login">
                  Manager
                </Link>
                <Link className="btn btn-secondary" to="/guest">
                  Guest
                </Link>
              </div>
            </div>
            <div className="card-grid">
              <div className="choice-card">
                <strong>Manager</strong>
                <p>Login, manage employees, and register face samples in batches of five.</p>
              </div>
              <div className="choice-card">
                <strong>Guest</strong>
                <p>A placeholder for the browser camera check-in flow that comes next.</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

export default LandingPage;
