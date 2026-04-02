import { Navigate, Outlet, useLocation } from "react-router-dom";

import { useManagerAuth } from "../context/ManagerAuthContext";

export function ProtectedRoute({ children }) {
  const location = useLocation();
  const { status } = useManagerAuth();

  if (status === "loading") {
    return (
      <main className="page-frame">
        <div className="surface">
          <p className="note">Checking your manager session...</p>
        </div>
      </main>
    );
  }

  if (status !== "authenticated") {
    return <Navigate to="/manager/login" replace state={{ from: location.pathname }} />;
  }

  return children ?? <Outlet />;
}

export default ProtectedRoute;
