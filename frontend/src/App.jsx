import { Navigate, Outlet, Route, Routes } from "react-router-dom";

import { ManagerAuthProvider } from "./context/ManagerAuthContext";
import { ManagerLayout } from "./components/ManagerLayout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { EmployeeFacesPage } from "./pages/EmployeeFacesPage";
import { EmployeeListPage } from "./pages/EmployeeListPage";
import GuestPlaceholderPage from "./pages/GuestPlaceholderPage";
import { LandingPage } from "./pages/LandingPage";
import { ManagerLoginPage } from "./pages/ManagerLoginPage";

function ManagerRoutes() {
  return (
    <ProtectedRoute>
      <ManagerLayout>
        <Outlet />
      </ManagerLayout>
    </ProtectedRoute>
  );
}

export function App() {
  return (
    <ManagerAuthProvider>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/guest" element={<GuestPlaceholderPage />} />
        <Route path="/manager/login" element={<ManagerLoginPage />} />
        <Route path="/manager" element={<ManagerRoutes />}>
          <Route index element={<Navigate to="/manager/employees" replace />} />
          <Route path="employees" element={<EmployeeListPage />} />
          <Route path="employees/:employeeId/faces" element={<EmployeeFacesPage />} />
        </Route>
      </Routes>
    </ManagerAuthProvider>
  );
}
