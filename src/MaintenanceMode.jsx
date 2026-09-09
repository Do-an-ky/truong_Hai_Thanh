import { useState } from "react";
import "./MaintenanceMode.css";

const API_BASE_URL = "http://localhost:5000/api";

export default function MaintenanceMode({
  maintenance,
  onAdminLogin,
}) {
  const [showLogin, setShowLogin] = useState(false);
  const [form, setForm] = useState({
    email: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const loginAdmin = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `${API_BASE_URL}/auth/login`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: form.email.trim(),
            password: form.password,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Đăng nhập thất bại"
        );
      }

      const user = data.user;

      if (user?.role !== "admin") {
        throw new Error(
          "Chỉ tài khoản quản trị viên được truy cập khi hệ thống đang bảo trì."
        );
      }

      const token =
        data.token ||
        data.accessToken ||
        "";

      if (!token) {
        throw new Error(
          "Máy chủ không trả về token đăng nhập."
        );
      }

      onAdminLogin?.({
        token,
        user,
      });
    } catch (err) {
      setError(
        err.message ||
          "Không thể đăng nhập quản trị."
      );
    } finally {
      setLoading(false);
    }
  };

  const title =
    maintenance?.title ||
    "Hệ thống đang bảo trì";

  const message =
    maintenance?.message ||
    "ClothStore đang được nâng cấp để mang lại trải nghiệm tốt hơn. Vui lòng quay lại sau.";

  return (
    <main className="maintenance-page">
      <div className="maintenance-shell">
        <div className="maintenance-brand">
          <span>🛍️</span>

          <div>
            <strong>ClothStore</strong>
            <small>
              Thời trang cho mọi phong cách
            </small>
          </div>
        </div>

        <div className="maintenance-icon">
          ⚙️
        </div>

        <span className="maintenance-badge">
          BẢO TRÌ HỆ THỐNG
        </span>

        <h1>{title}</h1>

        <p className="maintenance-message">
          {message}
        </p>

        {maintenance?.estimatedEnd && (
          <div className="maintenance-time">
            <span>🕒</span>

            <div>
              <small>
                Thời gian dự kiến hoàn thành
              </small>

              <strong>
                {new Date(
                  maintenance.estimatedEnd
                ).toLocaleString(
                  "vi-VN"
                )}
              </strong>
            </div>
          </div>
        )}

        <div className="maintenance-actions">
          <button
            type="button"
            className="maintenance-refresh"
            onClick={() =>
              window.location.reload()
            }
          >
            ↻ Kiểm tra lại
          </button>

          <button
            type="button"
            className="maintenance-admin-button"
            onClick={() => {
              setShowLogin((prev) => !prev);
              setError("");
            }}
          >
            🔐 Quản trị viên
          </button>
        </div>

        {showLogin && (
          <form
            className="maintenance-login"
            onSubmit={loginAdmin}
          >
            <div>
              <strong>
                Đăng nhập quản trị
              </strong>

              <span>
                Admin vẫn có thể truy cập website trong thời gian bảo trì.
              </span>
            </div>

            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="Email quản trị"
              required
            />

            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              placeholder="Mật khẩu"
              required
            />

            {error && (
              <p className="maintenance-login-error">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
            >
              {loading
                ? "Đang đăng nhập..."
                : "Đăng nhập Admin"}
            </button>
          </form>
        )}

        <footer>
          © 2026 ClothStore · Cảm ơn bạn đã kiên nhẫn.
        </footer>
      </div>
    </main>
  );
}
