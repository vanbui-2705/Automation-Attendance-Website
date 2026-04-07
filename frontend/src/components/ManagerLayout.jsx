import { NavLink, Outlet } from "react-router-dom";
import { useManagerAuth } from "../context/ManagerAuthContext";

export default function ManagerLayout() {
  const { manager, logout } = useManagerAuth();

  return (
    <div className="manager-shell">
      <aside className="manager-sidebar">
        <div className="sidebar-brand">
          <h2>Auto Attendance</h2>
          {manager?.username ? (
            <p>Xin chào, {manager.username}</p>
          ) : null}
        </div>

        <nav className="manager-nav" aria-label="Manager navigation">
          <NavLink to="/manager/employees">
            <span className="nav-icon">👥</span>
            Nhân viên
          </NavLink>
          <NavLink to="/manager/attendance">
            <span className="nav-icon">📋</span>
            Chấm công
          </NavLink>
        </nav>

        {typeof logout === "function" ? (
          <button type="button" className="manager-logout" onClick={logout}>
            <span className="nav-icon">↩</span>
            Đăng xuất
          </button>
        ) : null}
      </aside>

      <main className="manager-main page-transition">
        <Outlet />
      </main>
    </div>
  );
}
