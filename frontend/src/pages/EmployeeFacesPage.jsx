import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { deleteFaceSamples, enrollFaceSamples, getFaceSamples } from "../lib/api";
import { getFriendlyErrorMessage } from "../lib/errorMessages";
import { useManagerAuth } from "../context/ManagerAuthContext";

const TOTAL_SLOTS = 5;

export function EmployeeFacesPage() {
  const { employeeId } = useParams();
  const navigate = useNavigate();
  const { setUnauthenticated } = useManagerAuth();
  const [employee, setEmployee] = useState(null);
  const [faceSamples, setFaceSamples] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("info");
  const [files, setFiles] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function loadFaceSamples() {
    setLoading(true);
    setMessage("");

    try {
      const response = await getFaceSamples(employeeId);
      setEmployee(response.employee);
      setFaceSamples(response.face_samples || []);
    } catch (error) {
      if (error.status === 401) {
        setUnauthenticated();
        navigate("/manager/login", { replace: true });
        return;
      }
      if (error.status === 404) {
        setMessage("Không tìm thấy nhân viên.");
        setMessageType("error");
        setEmployee(null);
        setFaceSamples([]);
        return;
      }
      setMessage(error.message || "Không thể tải dữ liệu khuôn mặt.");
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadFaceSamples();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeId]);

  async function handleEnroll(event) {
    event.preventDefault();
    setMessage("");

    if (files.length !== 5) {
      setMessage("Vui lòng chọn chính xác 5 hình ảnh.");
      setMessageType("error");
      return;
    }

    setSubmitting(true);

    try {
      await enrollFaceSamples(employeeId, files);
      setFiles([]);
      await loadFaceSamples();
      setMessage("Đã đăng ký khuôn mặt thành công!");
      setMessageType("success");
    } catch (error) {
      if (error.status === 401) {
        setUnauthenticated();
        navigate("/manager/login", { replace: true });
        return;
      }
      setMessage(getFriendlyErrorMessage(error, "Không thể đăng ký khuôn mặt. Vui lòng thử lại."));
      setMessageType("error");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    setMessage("");

    try {
      await deleteFaceSamples(employeeId);
      await loadFaceSamples();
      setMessage("Đã xóa đăng ký khuôn mặt thành công.");
      setMessageType("success");
    } catch (error) {
      if (error.status === 401) {
        setUnauthenticated();
        navigate("/manager/login", { replace: true });
        return;
      }
      setMessage(getFriendlyErrorMessage(error, "Không thể xóa đăng ký khuôn mặt. Vui lòng thử lại."));
      setMessageType("error");
    } finally {
      setDeleting(false);
    }
  }

  const sampleCount = faceSamples.length;
  const emptySlots = Math.max(0, TOTAL_SLOTS - sampleCount);

  return (
    <div className="stack-lg page-transition">
      {/* Header */}
      <div className="page-header">
        <div className="page-header-info">
          <div className="row" style={{ gap: "var(--sp-2)" }}>
            <Link to="/manager/employees" className="btn btn-ghost btn-sm" style={{ marginLeft: -8 }}>
              ← Quay lại
            </Link>
          </div>
          <h1>Đăng ký khuôn mặt</h1>
          <p>
            {employee ? `${employee.employee_code} — ${employee.full_name}` : "Đang tải..."}
          </p>
        </div>
        <div className="row" style={{ gap: "var(--sp-2)" }}>
          <span className={`badge ${sampleCount === TOTAL_SLOTS ? "badge-success" : "badge-warning"}`}>
            {sampleCount}/{TOTAL_SLOTS} mẫu
          </span>
        </div>
      </div>

      {/* Alert */}
      {message && (
        <div className={`alert alert-${messageType}`} role={messageType === "error" ? "alert" : undefined}>
          {message}
        </div>
      )}

      {/* Grid: Face slots left, Upload form right */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: "var(--sp-6)", alignItems: "start" }}>

        {/* Face Sample Grid */}
        <div className="card">
          <h3 style={{ marginBottom: "var(--sp-4)" }}>Mẫu khuôn mặt hiện tại</h3>

          {loading ? (
            <div className="loading-row">
              <div className="spinner" />
              Đang tải dữ liệu...
            </div>
          ) : (
            <>
              <div style={{
                display: "grid",
                gridTemplateColumns: `repeat(${TOTAL_SLOTS}, 1fr)`,
                gap: "var(--sp-3)"
              }}>
                {faceSamples.map((sample) => (
                  <div key={sample.id} style={{
                    aspectRatio: "1",
                    borderRadius: "var(--radius-sm)",
                    background: "var(--success-bg)",
                    border: "2px solid var(--success)",
                    display: "grid",
                    placeItems: "center",
                    fontSize: "13px",
                    fontWeight: 500,
                    color: "var(--success)",
                  }}>
                    ✓ #{sample.sample_index}
                  </div>
                ))}
                {Array.from({ length: emptySlots }).map((_, i) => (
                  <div key={`empty-${i}`} style={{
                    aspectRatio: "1",
                    borderRadius: "var(--radius-sm)",
                    border: "2px dashed var(--border)",
                    display: "grid",
                    placeItems: "center",
                    fontSize: "12px",
                    color: "var(--text-hint)",
                  }}>
                    Trống
                  </div>
                ))}
              </div>

              {sampleCount > 0 && (
                <div style={{ marginTop: "var(--sp-4)" }}>
                  <button
                    className="btn btn-danger btn-sm"
                    type="button"
                    onClick={handleDelete}
                    disabled={deleting || loading}
                  >
                    {deleting ? "Đang xóa..." : "Xóa toàn bộ đăng ký"}
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Upload Form */}
        <div className="card stack">
          <h3>Tải lên 5 ảnh khuôn mặt</h3>
          <p style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
            Chọn đúng 5 hình ảnh rõ mặt, từ nhiều góc độ khác nhau để tăng độ chính xác nhận diện.
          </p>
          <form className="field-group" onSubmit={handleEnroll}>
            <div className="field">
              <label htmlFor="face-files">Hình ảnh khuôn mặt</label>
              <input
                id="face-files"
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => setFiles(Array.from(e.target.files || []))}
                style={{ padding: "8px" }}
              />
            </div>
            {files.length > 0 && files.length !== 5 && (
              <p style={{ fontSize: "12px", color: "var(--warning)" }}>
                Đã chọn {files.length} ảnh. Cần đúng 5 ảnh.
              </p>
            )}
            <button className="btn btn-primary" type="submit" disabled={submitting}>
              {submitting ? (
                <><div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Đang đăng ký...</>
              ) : (
                "Đăng ký khuôn mặt"
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default EmployeeFacesPage;
