import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { adminFetch, isAdminLoggedIn } from "../adminAuth"; // adjust path if needed

export default function TablesDemoPage() {
  const api = import.meta.env.VITE_API_URL;
  const nav = useNavigate();

  const [tables, setTables] = useState([]);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  const [hoverId, setHoverId] = useState(null);

  const [ordersOpen, setOrdersOpen] = useState(false);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersErr, setOrdersErr] = useState("");
  const [orders, setOrders] = useState([]);
  const [ordersTableId, setOrdersTableId] = useState("");

  async function loadTables() {
    setErr("");
    setLoading(true);
    try {
      const r = await adminFetch(`${api}/api/admin/tables`);
      if (r.status === 401) {
        nav("/admin");
        return;
      }
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = await r.json();
      setTables(data);
    } catch (e) {
      setErr(`Failed to load rooms: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!isAdminLoggedIn()) {
      nav("/admin");
      return;
    }
    loadTables();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function openTable(tableId) {
    setErr("");
    const r = await adminFetch(`${api}/api/admin/tables/${tableId}/scan-url`);
    if (r.status === 401) return nav("/admin");
    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      setErr(j.error || "Failed to get scan url");
      return;
    }
    const { url } = await r.json();
    window.location.href = url;
  }

  async function viewOrders(tableId) {
    setOrdersTableId(tableId);
    setOrdersErr("");
    setOrders([]);
    setOrdersOpen(true);
    setOrdersLoading(true);

    try {
      const r = await adminFetch(`${api}/api/admin/tables/${tableId}/orders`);
      if (r.status === 401) return nav("/admin");
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j.error || `HTTP ${r.status}`);
      }
      const data = await r.json();
      setOrders(data);
    } catch (e) {
      setOrdersErr(e.message);
    } finally {
      setOrdersLoading(false);
    }
  }

  return (
    <div
      style={{
        maxWidth: 950,
        margin: "40px auto",
        padding: 20,
        color: "white",
        backgroundColor: "#111827",
        borderRadius: 12,
      }}
    >
      <h1 style={{ marginBottom: 8 }}>Admin — Sobe</h1>
      {/* <p style={{ marginTop: 0, opacity: 0.75 }}>
        View rooms and open the room page with the correct token.
      </p> */}

      {err && <div style={{ color: "#f87171", marginBottom: 10 }}>{err}</div>}
      {loading && <div style={{ opacity: 0.8 }}>Loading…</div>}

      <div style={{ border: "1px solid #374151", borderRadius: 10, overflow: "hidden" }}>
        {tables.map((t) => {
          const hovered = hoverId === t.id;

          return (
            <div
              key={t.id}
              onMouseEnter={() => setHoverId(t.id)}
              onMouseLeave={() => setHoverId(null)}
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
                padding: "10px 12px",
                borderBottom: "1px solid #1f2937",
                alignItems: "center",
                backgroundColor: hovered ? "#0b1220" : "transparent",
                transition: "background-color 120ms ease",
              }}
            >
              <div>
                <div style={{ fontWeight: 800 }}>
                  Soba {t.id}
                </div>
                {/* <div style={{ fontSize: 12, opacity: 0.75 }}>
                  {t.isActive ? "Active" : "Inactive"} • token: {String(t.token).slice(0, 8)}…
                </div> */}
              </div>

              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button
                  onClick={() => viewOrders(t.id)}
                  style={{
                    padding: "10px 12px",
                    cursor: "pointer",
                    backgroundColor: hovered ? "#374151" : "#263244",
                    color: "white",
                    border: "none",
                    borderRadius: 6,
                    fontWeight: 700,
                  }}
                >
                  Pogledaj narudžbe
                </button>

                <button
                  onClick={() => openTable(t.id)}
                  style={{
                    padding: "8px 12px",
                    cursor: "pointer",
                    backgroundColor: "#2563eb",
                    color: "white",
                    border: "none",
                    borderRadius: 6,
                    fontWeight: 700,
                  }}
                >
                  Otvori
                </button>
              </div>
            </div>
          );
        })}

        {tables.length === 0 && !loading && (
          <div style={{ padding: 14, opacity: 0.7 }}>No rooms found.</div>
        )}
      </div>

      {ordersOpen && (
        <div
          onClick={() => setOrdersOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
            zIndex: 9999,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(900px, 100%)",
              maxHeight: "80vh",
              overflow: "auto",
              background: "#0b1220",
              border: "1px solid #374151",
              borderRadius: 12,
              padding: 16,
              color: "white",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
              <div>
                <div style={{ fontWeight: 900, fontSize: 18 }}>Orders — Room {ordersTableId}</div>
                <div style={{ fontSize: 12, opacity: 0.75 }}>Latest 50 orders</div>
              </div>

              <button
                onClick={() => setOrdersOpen(false)}
                style={{
                  padding: "8px 12px",
                  cursor: "pointer",
                  backgroundColor: "#374151",
                  color: "white",
                  border: "none",
                  borderRadius: 6,
                  fontWeight: 800,
                }}
              >
                Zatvori
              </button>
            </div>

            <div style={{ marginTop: 12 }}>
              {ordersLoading && <div style={{ opacity: 0.8 }}>Loading…</div>}
              {ordersErr && <div style={{ color: "#f87171" }}>{ordersErr}</div>}

              {!ordersLoading && !ordersErr && orders.length === 0 && (
                <div style={{ opacity: 0.75 }}>Nema narudžbi</div>
              )}

              {!ordersLoading && !ordersErr && orders.length > 0 && (
                <div style={{ display: "grid", gap: 10 }}>
                  {orders.map((o) => (
                    <div
                      key={o.id}
                      style={{
                        border: "1px solid #1f2937",
                        borderRadius: 10,
                        padding: 12,
                        background: "#0f172a",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                        <div style={{ fontWeight: 900 }}>
                          #{o.id.slice(0, 8)}…{" "}
                          <span style={{ fontSize: 12, opacity: 0.75, fontWeight: 700 }}>({o.status})</span>
                        </div>
                        <div style={{ fontSize: 12, opacity: 0.75 }}>
                          {new Date(o.createdAt).toLocaleString()}
                        </div>
                      </div>

                      <div style={{ marginTop: 8, display: "grid", gap: 6 }}>
                        {o.items.map((it) => (
                          <div
                            key={it.id}
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              gap: 10,
                              fontSize: 14,
                              borderTop: "1px dashed #1f2937",
                              paddingTop: 6,
                            }}
                          >
                            <div>
                              <b>{it.qty}×</b> {it.name}
                              {it.note ? <span style={{ opacity: 0.75 }}> — {it.note}</span> : null}
                            </div>
                            <div style={{ opacity: 0.85 }}>{(it.price * it.qty).toFixed(2)}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
