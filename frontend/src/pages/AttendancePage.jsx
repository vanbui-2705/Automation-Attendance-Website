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
  return `${pad(date.getHours())}:${pad(date.getMinutes())} ${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
}

function normalizeError(error) {
  const status = error?.payload?.status || error?.status;
  if (status === "unauthorized") {
    return "Ban can dang nhap lai.";
  }
  if (status === "invalid_request" && error?.payload?.message) {
    return error.payload.message;
  }
  return error?.payload?.message || error?.message || "Khong the tai du lieu cham cong.";
}

export default function AttendancePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setUnauthenticated } = useManagerAuth();
  const today = useMemo(() => getLocalDateValue(), []);
  const [filters, setFilters] = useState({
    from: today,
    to: today,
    search: "",
  });
  const [form, setForm] = useState({
    from: today,
    to: today,
    search: "",
  });
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
        if (cancelled) {
          return;
        }
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
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
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
    <section className="attendance-page">
      <header className="attendance-hero">
        <div>
          <p className="section-eyebrow">Manager Attendance</p>
          <h1>Nhật ký chấm công</h1>
          <p className="attendance-summary-copy">
            Xem lịch sử chấm công theo ngày, tìm theo mã nhân viên hoặc tên, và mở ảnh check-in ngay trong browser.
          </p>
        </div>

        <div className="attendance-summary-card" aria-label="Tong so ban ghi">
          <span className="attendance-summary-label">Tong ban ghi</span>
          <strong>{summary.total_records || 0}</strong>
        </div>
      </header>

      <form className="attendance-filters" onSubmit={handleSubmit}>
        <label>
          Tu ngay
          <input
            type="date"
            value={form.from}
            onChange={(event) => setForm((current) => ({ ...current, from: event.target.value }))}
          />
        </label>
        <label>
          Den ngay
          <input
            type="date"
            value={form.to}
            onChange={(event) => setForm((current) => ({ ...current, to: event.target.value }))}
          />
        </label>
        <label className="attendance-search">
          Tim nhan vien
          <input
            type="text"
            placeholder="Ma nhan vien hoac ten"
            value={form.search}
            onChange={(event) => setForm((current) => ({ ...current, search: event.target.value }))}
          />
        </label>
        <div className="attendance-actions">
          <button type="submit" disabled={loading}>
            Ap dung
          </button>
          <button type="button" className="secondary" onClick={handleReset} disabled={loading}>
            Tro ve hom nay
          </button>
        </div>
      </form>

      {error ? <div role="alert" className="attendance-error">{error}</div> : null}
      {loading ? <p className="attendance-state">Dang tai du lieu cham cong...</p> : null}

      {!loading && records.length === 0 ? (
        <div className="attendance-empty-state">
          <h2>Khong co ban ghi</h2>
          <p>Hay thu doi bo loc ngay hoac tim kiem khac.</p>
        </div>
      ) : null}

      {!loading && records.length > 0 ? (
        <div className="attendance-table-wrap">
          <table className="attendance-table">
            <thead>
              <tr>
                <th>Anh</th>
                <th>Ma NV</th>
                <th>Ho ten</th>
                <th>Thoi gian check-in</th>
              </tr>
            </thead>
            <tbody>
              {records.map((record) => (
                <tr key={record.id}>
                  <td>
                    <a href={record.snapshot_url} target="_blank" rel="noreferrer" className="attendance-snapshot-link">
                      <img
                        src={record.snapshot_url}
                        alt={`Anh check-in cua ${record.full_name}`}
                        className="attendance-thumb"
                      />
                      <span>Xem anh</span>
                    </a>
                  </td>
                  <td>{record.employee_code}</td>
                  <td>{record.full_name}</td>
                  <td>{formatCheckedInAt(record.checked_in_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}
