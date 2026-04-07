import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { createEmployee, getEmployees } from "../lib/api";
import { getFriendlyErrorMessage } from "../lib/errorMessages";
import { useManagerAuth } from "../context/ManagerAuthContext";

export function EmployeeListPage() {
  const navigate = useNavigate();
  const { setUnauthenticated } = useManagerAuth();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("info");
  const [code, setCode] = useState("");
  const [fullName, setFullName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function loadEmployees() {
    setLoading(true);
    setMessage("");

    try {
      const response = await getEmployees();
      setEmployees(response.employees || []);
    } catch (error) {
      if (error.status === 401) {
        setUnauthenticated();
        navigate("/manager/login", { replace: true });
        return;
      }
      setMessage(error.message || "Failed to load employees");
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadEmployees();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setMessage("");

    try {
      await createEmployee(code.trim(), fullName.trim());
      setCode("");
      setFullName("");
      await loadEmployees();
      setMessage("Đã tạo nhân viên thành công!");
      setMessageType("success");
    } catch (error) {
      if (error.status === 401) {
        setUnauthenticated();
        navigate("/manager/login", { replace: true });
        return;
      }
      setMessage(getFriendlyErrorMessage(error, "Không thể tạo nhân viên. Vui lòng thử lại."));
      setMessageType("error");
    } finally {
      setSubmitting(false);
    }
  }

  const activeCount = employees.filter((e) => e.is_active).length;

  return (
    <div className="stack-lg page-transition">
      {/* Page Header */}
      <div className="page-header">
        <div className="page-header-info">
          <h1>Quản lý nhân viên</h1>
          <p>
            Tổng cộng {employees.length} nhân viên · {activeCount} đang hoạt động
          </p>
        </div>
      </div>

      {/* Alert message */}
      {message && (
        <div className={`alert alert-${messageType}`} role={messageType === "error" ? "alert" : undefined}>
          {message}
        </div>
      )}

      {/* Main grid: Table left, Form right */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: "var(--sp-6)", alignItems: "start" }}>

        {/* Employee Table */}
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          {loading ? (
            <div className="loading-row">
              <div className="spinner" />
              Đang tải danh sách nhân viên...
            </div>
          ) : employees.length === 0 ? (
            <div className="empty-state">
              <h3>Chưa có nhân viên nào</h3>
              <p>Hãy tạo nhân viên đầu tiên ở bên phải.</p>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Mã NV</th>
                  <th>Họ tên</th>
                  <th>Trạng thái</th>
                  <th style={{ textAlign: "right" }}>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((employee) => (
                  <tr key={employee.id}>
                    <td><strong>{employee.employee_code}</strong></td>
                    <td>{employee.full_name}</td>
                    <td>
                      <span className={`badge ${employee.is_active ? "badge-success" : "badge-error"}`}>
                        {employee.is_active ? "Hoạt động" : "Ngưng"}
                      </span>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <Link className="btn btn-ghost btn-sm" to={`/manager/employees/${employee.id}/faces`}>
                        Khuôn mặt →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Create Employee Form */}
        <div className="card stack">
          <h3>Thêm nhân viên mới</h3>
          <form className="field-group" onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="emp-code">Mã nhân viên</label>
              <input id="emp-code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="VD: NV001" />
            </div>
            <div className="field">
              <label htmlFor="emp-name">Họ và tên</label>
              <input id="emp-name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="VD: Nguyễn Văn A" />
            </div>
            <button className="btn btn-primary" type="submit" disabled={submitting}>
              {submitting ? (
                <><div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Đang tạo...</>
              ) : (
                "Tạo nhân viên"
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default EmployeeListPage;
