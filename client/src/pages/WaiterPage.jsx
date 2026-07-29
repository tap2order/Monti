import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { useNavigate } from "react-router-dom";
import "../css/WaiterPage.css";
import { clearAdminAuth, getAdminToken } from "../adminAuth";
import { clearStaffToken, getStaffToken, setStaffToken } from "../staffAuth";

function responseError(response, fallback) {
  return response.json().then((data) => data?.error || fallback).catch(() => fallback);
}

export default function WaiterPage({ accessMode = "staff" }) {
  const navigate = useNavigate();
  const api = import.meta.env.VITE_API_URL || "";
  const isAdmin = accessMode === "admin";
  const [token, setToken] = useState(() => isAdmin ? getAdminToken() : getStaffToken());
  const [pin, setPin] = useState("");
  const [loginBusy, setLoginBusy] = useState(false);
  const [orders, setOrders] = useState([]);
  const [calls, setCalls] = useState([]);
  const [claimedOrders, setClaimedOrders] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const socketRef = useRef(null);

  function clearDashboard() {
    setOrders([]);
    setCalls([]);
    setClaimedOrders([]);
  }

  function endInvalidSession() {
    if (isAdmin) {
      clearAdminAuth();
      navigate("/admin", { replace: true });
    } else {
      clearStaffToken();
      setToken("");
      setPin("");
    }
    clearDashboard();
  }

  function logoutStaff() {
    clearStaffToken();
    setToken("");
    setPin("");
    setError("");
    clearDashboard();
  }

  async function loginStaff(event) {
    event.preventDefault();
    setLoginBusy(true);
    setError("");
    try {
      const response = await fetch(`${api}/auth/staff/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      if (!response.ok) throw new Error("Pogrešan PIN.");
      const data = await response.json();
      if (!data.token) throw new Error("Prijava nije uspjela.");
      setStaffToken(data.token);
      setToken(data.token);
      setPin("");
    } catch (err) {
      setError(err.message || "Prijava nije uspjela.");
    } finally {
      setLoginBusy(false);
    }
  }

  async function loadDashboard() {
    setLoading(true);
    setError("");
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [openOrders, openCalls, claimed] = await Promise.all([
        fetch(`${api}/orders/unclaimed`, { headers }),
        fetch(`${api}/calls/open`, { headers }),
        fetch(`${api}/orders/claimed`, { headers }),
      ]);
      if ([openOrders, openCalls, claimed].some((response) => response.status === 401)) {
        endInvalidSession();
        return;
      }
      if (![openOrders, openCalls, claimed].every((response) => response.ok)) {
        throw new Error("Podaci se trenutno ne mogu učitati.");
      }
      setOrders(await openOrders.json());
      setCalls(await openCalls.json());
      setClaimedOrders(await claimed.json());
    } catch (err) {
      setError(err.message || "Podaci se trenutno ne mogu učitati.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!token) {
      if (isAdmin) navigate("/admin", { replace: true });
      return;
    }
    loadDashboard();
    const socket = io(api, { transports: ["websocket"], auth: { token } });
    socketRef.current = socket;
    socket.on("order:new", (order) => {
      setOrders((current) => current.some((item) => item.id === order.id) ? current : [order, ...current]);
    });
    socket.on("order:updated", (order) => {
      setOrders((current) => order.status === "UNCLAIMED"
        ? [order, ...current.filter((item) => item.id !== order.id)]
        : current.filter((item) => item.id !== order.id));
      setClaimedOrders((current) => order.status === "CLAIMED"
        ? [order, ...current.filter((item) => item.id !== order.id)]
        : current.filter((item) => item.id !== order.id));
    });
    socket.on("order:deleted", ({ orderId }) => {
      setOrders((current) => current.filter((item) => item.id !== orderId));
      setClaimedOrders((current) => current.filter((item) => item.id !== orderId));
    });
    socket.on("call:new", (call) => {
      setCalls((current) => current.some((item) => item.id === call.id) ? current : [call, ...current]);
    });
    socket.on("call:handled", ({ callId }) => {
      setCalls((current) => current.filter((item) => item.id !== callId));
    });
    socket.on("connect_error", () => setError("Veza za obavijesti nije dostupna. Osvježite stranicu."));
    return () => socket.disconnect();
    // The authenticated token is the lifecycle boundary for this socket.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api, isAdmin, navigate, token]);

  async function action(path, method, id) {
    setBusyId(id);
    setError("");
    try {
      const response = await fetch(`${api}${path}`, {
        method,
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.status === 401) return endInvalidSession();
      if (!response.ok) throw new Error(await responseError(response, "Akcija nije uspjela."));
      await loadDashboard();
    } catch (err) {
      setError(err.message || "Akcija nije uspjela.");
    } finally {
      setBusyId("");
    }
  }

  if (!token && isAdmin) return null;

  if (!token) {
    return (
      <main className="wp-page">
        <form className="wp-loginCard" onSubmit={loginStaff}>
          <div className="wp-meta">Tap2Order Monti</div>
          <h1 className="wp-title">Prijava osoblja</h1>
          <p className="wp-loginText">Unesite PIN za pristup narudžbama i pozivima gostiju.</p>
          <label className="wp-loginLabel" htmlFor="staff-pin">PIN osoblja</label>
          <input
            id="staff-pin"
            className="wp-loginInput"
            type="password"
            inputMode="numeric"
            autoComplete="current-password"
            value={pin}
            onChange={(event) => setPin(event.target.value)}
            required
            autoFocus
          />
          {error && <div className="wp-alert wp-alert--error">{error}</div>}
          <button className="wp-btn wp-btn--primary wp-loginSubmit" disabled={loginBusy}>
            {loginBusy ? "Prijava…" : "Prijavi se"}
          </button>
        </form>
      </main>
    );
  }

  const card = (order, claimed = false) => (
    <article key={order.id} className="wp-card">
      <div className="wp-cardInner">
        <div className="wp-cardTop">
          <div>
            <div className="wp-cardTitle">Soba {order.tableId}</div>
            <div className="wp-itemsCount">{order.items.length} stavki</div>
          </div>
          <div className="wp-cardBtns">
            {claimed ? (
              <>
                <button disabled={busyId === order.id} onClick={() => action(`/orders/${order.id}/complete`, "POST", order.id)} className="wp-btn wp-btn--success">Završeno</button>
                <button disabled={busyId === order.id} onClick={() => action(`/orders/${order.id}/unclaim`, "POST", order.id)} className="wp-btn wp-btn--danger">Vrati</button>
              </>
            ) : (
              <button disabled={busyId === order.id} onClick={() => action(`/orders/${order.id}/claim`, "PATCH", order.id)} className="wp-btn wp-btn--primary">Preuzmi</button>
            )}
          </div>
        </div>
        <div className="wp-items">
          {order.items.map((item) => (
            <div key={item.id} className="wp-itemRow">
              <div>
                <div className="wp-itemName">{item.name} × {item.qty}</div>
                {item.note && <div className="wp-note">{item.note}</div>}
              </div>
              <div className="wp-itemPrice">{(Number(item.price) * item.qty).toFixed(2)} KM</div>
            </div>
          ))}
        </div>
      </div>
    </article>
  );

  return (
    <main className="wp-page">
      <div className="wp-shell">
        {isAdmin && (
          <button type="button" className="wp-adminBack" onClick={() => navigate("/admin/home")}>
            ← Vrati na admin dashboard
          </button>
        )}
        <header className="wp-top">
          <div>
            <h1 className="wp-title">Dashboard osoblja</h1>
            <div className="wp-meta">{isAdmin ? "Admin pristup" : "Konobarski pristup"}</div>
          </div>
          {!isAdmin && <button className="wp-btn wp-btn--ghost" onClick={logoutStaff}>Odjava</button>}
        </header>
        {error && <div className="wp-alert wp-alert--error">{error}</div>}
        {loading ? (
          <div className="wp-empty">Učitavanje…</div>
        ) : (
          <>
            <section className="wp-section">
              <h2 className="wp-h2">Pozivi</h2>
              <div className="wp-grid">
                {calls.length ? calls.map((call) => (
                  <article key={call.id} className="wp-card">
                    <div className="wp-cardInner">
                      <div className="wp-cardTop">
                        <div>
                          <div className="wp-cardTitle">Soba {call.tableId}</div>
                          <div className="wp-meta">{call.type === "bill" ? "Zahtjev za račun" : "Zahtjev za pomoć"}</div>
                          {call.message && <div className="wp-callMessage" dir="auto">{call.message}</div>}
                        </div>
                        <button disabled={busyId === call.id} onClick={() => action(`/calls/${call.id}/handle`, "PATCH", call.id)} className="wp-btn wp-btn--primary">Obrađeno</button>
                      </div>
                    </div>
                  </article>
                )) : <div className="wp-empty">Nema otvorenih poziva.</div>}
              </div>
            </section>
            <section className="wp-section">
              <h2 className="wp-h2">Nove narudžbe</h2>
              <div className="wp-grid">{orders.length ? orders.map((order) => card(order)) : <div className="wp-empty">Nema novih narudžbi.</div>}</div>
            </section>
            <section className="wp-section">
              <h2 className="wp-h2">Preuzete narudžbe</h2>
              <div className="wp-grid">{claimedOrders.length ? claimedOrders.map((order) => card(order, true)) : <div className="wp-empty">Nema preuzetih narudžbi.</div>}</div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
