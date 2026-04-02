import { NavLink, Outlet } from "react-router-dom";
import { useManagerAuth } from "../context/ManagerAuthContext";

export default function ManagerLayout() {
  const { manager, logout } = useManagerAuth();

  return (
    <div className="manager-shell">
      <aside className="manager-sidebar">
        <div>
          <p className="section-eyebrow">Manager Console</p>
          <h1>Auto Attendance</h1>
          {manager?.username ? <p className="manager-meta">Dang nhap: {manager.username}</p> : null}
        </div>

        <nav className="manager-nav" aria-label="Manager navigation">
          <NavLink to="/manager/employees">Nhan vien</NavLink>
          <NavLink to="/manager/attendance">Cham cong</NavLink>
        </nav>

        {typeof logout === "function" ? (
          <button type="button" className="manager-logout" onClick={logout}>
            Dang xuat
          </button>
        ) : null}
      </aside>

      <main className="manager-main">
        <Outlet />
      </main>
    </div>
  );
}
