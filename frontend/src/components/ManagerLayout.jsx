import { Link, Outlet } from "react-router-dom";

import { useManagerAuth } from "../context/ManagerAuthContext";

export function ManagerLayout({ children }) {
  const { manager } = useManagerAuth();

  return (
    <main className="app-shell">
      <div className="page-frame">
        <header className="topbar">
          <Link to="/manager/employees" className="brand-mark" aria-label="Auto Attendance home">
            <span className="brand-dot" />
            <span>Auto Attendance</span>
          </Link>
          <span className="status">Manager: {manager?.username ?? "Signed in"}</span>
        </header>
        <section className="surface page-transition">{children ?? <Outlet />}</section>
      </div>
    </main>
  );
}
