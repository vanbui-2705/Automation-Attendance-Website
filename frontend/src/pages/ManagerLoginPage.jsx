import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { useManagerAuth } from "../context/ManagerAuthContext";
import { getFriendlyErrorMessage } from "../lib/errorMessages";

export function ManagerLoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { status, signIn, setError } = useManagerAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (status === "authenticated") {
      navigate("/manager/employees", { replace: true });
    }
  }, [navigate, status]);

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setMessage("");
    setError(null);

    try {
      await signIn(username.trim(), password);
      navigate(location.state?.from || "/manager/employees", { replace: true });
    } catch (caughtError) {
      setMessage(getFriendlyErrorMessage(caughtError, "Không thể đăng nhập. Vui lòng thử lại."));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "var(--bg-main)" }}>
      <div className="page-transition" style={{ width: "100%", maxWidth: 400, padding: "var(--sp-6)" }}>
        <div className="card-elevated stack" style={{ padding: "var(--sp-8)" }}>
          <div className="stack-sm" style={{ textAlign: "center", marginBottom: "var(--sp-4)" }}>
            <h1 style={{ fontSize: "1.5rem" }}>Auto Attendance</h1>
            <p style={{ color: "var(--text-secondary)", fontSize: "14px" }}>
              Đăng nhập để quản lý nhân viên và khuôn mặt.
            </p>
          </div>

          <form className="field-group" onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="login-user">Tên đăng nhập</label>
              <input
                id="login-user"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                placeholder="Nhập tên đăng nhập"
              />
            </div>
            <div className="field">
              <label htmlFor="login-pass">Mật khẩu</label>
              <input
                id="login-pass"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                placeholder="Nhập mật khẩu"
              />
            </div>

            {message && (
              <div className="alert alert-error" role="alert">
                {message}
              </div>
            )}

            <button className="btn btn-primary" type="submit" disabled={submitting} style={{ width: "100%", marginTop: "var(--sp-2)" }}>
              {submitting ? (
                <><div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Đang đăng nhập...</>
              ) : (
                "Đăng nhập"
              )}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}

export default ManagerLoginPage;
