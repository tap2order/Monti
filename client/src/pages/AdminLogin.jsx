import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { setAdminAuth } from "../adminAuth";

export default function AdminLogin() {
  const api = import.meta.env.VITE_API_URL;
  const nav = useNavigate();

  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");

    const auth = "Basic " + btoa(`${user}:${pass}`);
    setLoading(true);

    try {
      const r = await fetch(`${api}/api/admin/tables`, {
        headers: { Authorization: auth },
      });

      if (!r.ok) throw new Error("Wrong username or password");

      setAdminAuth(auth);
      localStorage.setItem("adminAuth", auth);

      nav("/admin/home");
    } catch (e2) {
      localStorage.removeItem("adminAuth");
      setAdminAuth("");
      setErr(e2.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "linear-gradient(180deg, #071120 0%, #0b1728 45%, #0f1f36 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px 16px",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 430,
          background: "rgba(17, 24, 39, 0.96)",
          color: "white",
          borderRadius: 20,
          border: "1px solid rgba(255,255,255,0.08)",
          boxShadow: "0 25px 60px rgba(0,0,0,0.35)",
          padding: "28px 22px",
          boxSizing: "border-box",
        }}
      >
        <div style={{ marginBottom: 24 }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 800,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: "#60a5fa",
              marginBottom: 10,
            }}
          >
            Tap2Order Monti
          </div>

          <h1
            style={{
              margin: 0,
              fontSize: "clamp(28px, 5vw, 36px)",
              lineHeight: 1.1,
              fontWeight: 900,
            }}
          >
            Admin Login
          </h1>

          <p
            style={{
              margin: "12px 0 0 0",
              color: "rgba(255,255,255,0.72)",
              fontSize: 15,
              lineHeight: 1.6,
            }}
          >
            Sign in to access the admin dashboard and manage the system.
          </p>
        </div>

        <form onSubmit={onSubmit} style={{ display: "grid", gap: 16 }}>
          <div style={{ display: "grid", gap: 8 }}>
            <label
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: "rgba(255,255,255,0.88)",
              }}
            >
              Username
            </label>
            <input
              value={user}
              onChange={(e) => setUser(e.target.value)}
              placeholder="Enter username"
              autoComplete="username"
              style={{
                width: "100%",
                padding: "14px 14px",
                background: "#111827",
                color: "white",
                border: "1px solid #374151",
                borderRadius: 12,
                outline: "none",
                fontSize: 15,
                boxSizing: "border-box",
              }}
            />
          </div>

          <div style={{ display: "grid", gap: 8 }}>
            <label
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: "rgba(255,255,255,0.88)",
              }}
            >
              Password
            </label>
            <input
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              type="password"
              placeholder="Enter password"
              autoComplete="current-password"
              style={{
                width: "100%",
                padding: "14px 14px",
                background: "#111827",
                color: "white",
                border: "1px solid #374151",
                borderRadius: 12,
                outline: "none",
                fontSize: 15,
                boxSizing: "border-box",
              }}
            />
          </div>

          {err && (
            <div
              style={{
                background: "rgba(239, 68, 68, 0.12)",
                border: "1px solid rgba(239, 68, 68, 0.35)",
                color: "#fca5a5",
                padding: "12px 14px",
                borderRadius: 12,
                fontSize: 14,
                lineHeight: 1.5,
              }}
            >
              {err}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "14px 16px",
              cursor: loading ? "not-allowed" : "pointer",
              background: loading
                ? "#3b82f6aa"
                : "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
              color: "white",
              border: "none",
              borderRadius: 12,
              fontWeight: 800,
              fontSize: 15,
              boxShadow: "0 12px 30px rgba(37, 99, 235, 0.28)",
              transition: "0.2s ease",
              opacity: loading ? 0.85 : 1,
            }}
          >
            {loading ? "Signing in..." : "Login"}
          </button>
        </form>
      </div>
    </div>
  );
}