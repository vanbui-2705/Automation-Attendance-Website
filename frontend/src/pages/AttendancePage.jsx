import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { listAttendance } from "../lib/attendanceApi";
import { useManagerAuth } from "../context/ManagerAuthContext";
import "./AttendancePage.css";

function pad(value) {
  return String(value).padStart(2, "0");
}

function getLocalDateValue(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function formatCheckedInAt(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return `${pad(date.getHours())}:${pad(date.getMinutes())} — ${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
}

function normalizeError(error) {
  const status = error?.payload?.status || error?.status;
  if (status === "unauthorized") {
    return "Bạn cần đăng nhập lại.";
  }
  if (status === "invalid_request" && error?.payload?.message) {
    return error.payload.message;
  }
  return error?.payload?.message || error?.message || "Không thể tải dữ liệu chấm công.";
}

export default function AttendancePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setUnauthenticated } = useManagerAuth();
  const today = useMemo(() => getLocalDateValue(), []);
  const [filters, setFilters] = useState({ from: today, to: today, search: "" });
  const [form, setForm] = useState({ from: today, to: today, search: "" });
  const [records, setRecords] = useState([]);
  const [summary, setSummary] = useState({ total_records: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");
      try {
        const payload = await listAttendance(filters);
        if (cancelled) return;
        setRecords(payload.records || []);
        setSummary(payload.summary || { total_records: 0 });
      } catch (caughtError) {
        if (caughtError?.status === 401 && !cancelled) {
          setUnauthenticated();
          cancelled = true;
          navigate("/manager/login", { replace: true, state: { from: location.pathname } });
          return;
        }
        if (!cancelled) {
          setError(normalizeError(caughtError));
          setRecords([]);
          setSummary({ total_records: 0 });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [filters]);

  function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setFilters({
      from: form.from || today,
      to: form.to || today,
      search: form.search.trim(),
    });
  }

  function handleReset() {
    const reset = { from: today, to: today, search: "" };
    setForm(reset);
    setFilters(reset);
  }

  return (
    <div className="stack-lg page-transition">
      {/* Header */}
      <div className="page-header">
        <div className="page-header-info">
          <h1>Nhật ký chấm công</h1>
          <p>Xem lịch sử điểm danh theo ngày, tìm theo mã nhân viên hoặc tên.</p>
        </div>
        <div className="attendance-summary-card" aria-label="Tổng số bản ghi">
          <span className="attendance-summary-label">Tổng bản ghi</span>
          <strong>{summary.total_records || 0}</strong>
        </div>
      </div>

      {/* Filters */}
      <form className="attendance-filters" onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="att-from">Từ ngày</label>
          <input
            id="att-from"
            type="date"
            value={form.from}
            onChange={(e) => setForm((c) => ({ ...c, from: e.target.value }))}
          />
        </div>
        <div className="field">
          <label htmlFor="att-to">Đến ngày</label>
          <input
            id="att-to"
            type="date"
            value={form.to}
            onChange={(e) => setForm((c) => ({ ...c, to: e.target.value }))}
          />
        </div>
        <div className="field" style={{ flex: 1.5 }}>
          <label htmlFor="att-search">Tìm nhân viên</label>
          <input
            id="att-search"
            type="text"
            placeholder="Mã NV hoặc họ tên"
            value={form.search}
            onChange={(e) => setForm((c) => ({ ...c, search: e.target.value }))}
          />
        </div>
        <div className="attendance-actions">
          <button className="btn btn-primary" type="submit" disabled={loading}>
            Áp dụng
          </button>
          <button className="btn btn-secondary" type="button" onClick={handleReset} disabled={loading}>
            Hôm nay
          </button>
        </div>
      </form>

      {/* Error */}
      {error ? <div className="alert alert-error" role="alert">{error}</div> : null}

      {/* Loading */}
      {loading ? (
        <div className="loading-row">
          <div className="spinner" />
          Đang tải dữ liệu chấm công...
        </div>
      ) : null}

      {/* Empty state */}
      {!loading && records.length === 0 ? (
        <div className="empty-state">
          <h3>Không có bản ghi</h3>
          <p>Hãy thử đổi bộ lọc ngày hoặc tìm kiếm khác.</p>
        </div>
      ) : null}

      {/* Table */}
      {!loading && records.length > 0 ? (
        <div className="attendance-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Ảnh</th>
                <th>Mã NV</th>
                <th>Họ tên</th>
                <th>Thời gian check-in</th>
              </tr>
            </thead>
            <tbody>
              {records.map((record) => (
                <tr key={record.id}>
                  <td>
                    <a href={record.snapshot_url} target="_blank" rel="noreferrer" className="attendance-snapshot-link">
                      <img
                        src={record.snapshot_url}
                        alt={`Ảnh check-in của ${record.full_name}`}
                        className="attendance-thumb"
                      />
                      Xem ảnh
                    </a>
                  </td>
                  <td><strong>{record.employee_code}</strong></td>
                  <td>{record.full_name}</td>
                  <td>{formatCheckedInAt(record.checked_in_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
