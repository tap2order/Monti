import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { useNavigate } from "react-router-dom";
import "../css/WaiterPage.css";
import { clearAdminAuth, getAdminAuth, getAdminToken } from "../adminAuth";

function responseError(response, fallback) {
  return response.json().then((data) => data?.error || fallback).catch(() => fallback);
}

export default function WaiterPage() {
  const navigate = useNavigate();
  const api = import.meta.env.VITE_API_URL || "";
  const token = getAdminToken();
  const [orders, setOrders] = useState([]);
  const [calls, setCalls] = useState([]);
  const [claimedOrders, setClaimedOrders] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const socketRef = useRef(null);

  function logout() {
    clearAdminAuth();
    setOrders([]);
    setCalls([]);
    setClaimedOrders([]);
    navigate("/admin", { replace: true });
  }

  async function loadDashboard() {
    setLoading(true);
    setError("");
    try {
      const headers = { Authorization: getAdminAuth() };
      const [openOrders, openCalls, claimed] = await Promise.all([
        fetch(`${api}/orders/unclaimed`, { headers }),
        fetch(`${api}/calls/open`, { headers }),
        fetch(`${api}/orders/claimed`, { headers }),
      ]);
      if ([openOrders, openCalls, claimed].some((response) => response.status === 401)) return logout();
      if (![openOrders, openCalls, claimed].every((response) => response.ok)) throw new Error("Podaci se trenutno ne mogu učitati.");
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
      navigate("/admin", { replace: true });
      return;
    }
    loadDashboard();
    const socket = io(api, { transports: ["websocket"], auth: { token } });
    socketRef.current = socket;
    socket.on("order:new", (order) => setOrders((current) => current.some((item) => item.id === order.id) ? current : [order, ...current]));
    socket.on("order:updated", (order) => {
      setOrders((current) => order.status === "UNCLAIMED" ? [order, ...current.filter((item) => item.id !== order.id)] : current.filter((item) => item.id !== order.id));
      setClaimedOrders((current) => order.status === "CLAIMED" ? [order, ...current.filter((item) => item.id !== order.id)] : current.filter((item) => item.id !== order.id));
    });
    socket.on("order:deleted", ({ orderId }) => { setOrders((current) => current.filter((item) => item.id !== orderId)); setClaimedOrders((current) => current.filter((item) => item.id !== orderId)); });
    socket.on("call:new", (call) => setCalls((current) => current.some((item) => item.id === call.id) ? current : [call, ...current]));
    socket.on("call:handled", ({ callId }) => setCalls((current) => current.filter((item) => item.id !== callId)));
    socket.on("connect_error", () => setError("Veza za obavijesti nije dostupna. Osvježite stranicu."));
    return () => socket.disconnect();
  // The authenticated token is the lifecycle boundary for this socket.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api, navigate, token]);

  async function action(path, method, id) {
    setBusyId(id);
    setError("");
    try {
      const response = await fetch(`${api}${path}`, { method, headers: { Authorization: getAdminAuth() } });
      if (response.status === 401) return logout();
      if (!response.ok) throw new Error(await responseError(response, "Akcija nije uspjela."));
      await loadDashboard();
    } catch (err) {
      setError(err.message || "Akcija nije uspjela.");
    } finally {
      setBusyId("");
    }
  }

  if (!token) return null;

  const card = (order, claimed = false) => <article key={order.id} className="wp-card"><div className="wp-cardInner"><div className="wp-cardTop"><div><div className="wp-cardTitle">Soba {order.tableId}</div><div className="wp-itemsCount">{order.items.length} stavki</div></div><div className="wp-cardBtns">{claimed ? <><button disabled={busyId === order.id} onClick={() => action(`/orders/${order.id}/complete`, "POST", order.id)} className="wp-btn wp-btn--success">Završeno</button><button disabled={busyId === order.id} onClick={() => action(`/orders/${order.id}/unclaim`, "POST", order.id)} className="wp-btn wp-btn--danger">Vrati</button></> : <button disabled={busyId === order.id} onClick={() => action(`/orders/${order.id}/claim`, "PATCH", order.id)} className="wp-btn wp-btn--primary">Preuzmi</button>}</div></div><div className="wp-items">{order.items.map((item) => <div key={item.id} className="wp-itemRow"><div><div className="wp-itemName">{item.name} × {item.qty}</div>{item.note && <div className="wp-note">{item.note}</div>}</div><div className="wp-itemPrice">{(Number(item.price) * item.qty).toFixed(2)} KM</div></div>)}</div></div></article>;

  return <main className="wp-page"><div className="wp-shell"><header className="wp-top"><div><h1 className="wp-title">Dashboard osoblja</h1><div className="wp-meta">Univerzalni hotelski staff pristup</div></div><button className="wp-btn wp-btn--ghost" onClick={logout}>Odjava</button></header>{error && <div className="wp-alert wp-alert--error">{error}</div>}{loading ? <div className="wp-empty">Učitavanje…</div> : <><section className="wp-section"><h2 className="wp-h2">Pozivi</h2><div className="wp-grid">{calls.length ? calls.map((call) => <article key={call.id} className="wp-card"><div className="wp-cardInner"><div className="wp-cardTop"><div><div className="wp-cardTitle">Soba {call.tableId}</div><div className="wp-meta">{call.type === "bill" ? "Zahtjev za račun" : "Zahtjev za pomoć"}</div></div><button disabled={busyId === call.id} onClick={() => action(`/calls/${call.id}/handle`, "PATCH", call.id)} className="wp-btn wp-btn--primary">Obrađeno</button></div></div></article>) : <div className="wp-empty">Nema otvorenih poziva.</div>}</div></section><section className="wp-section"><h2 className="wp-h2">Nove narudžbe</h2><div className="wp-grid">{orders.length ? orders.map((order) => card(order)) : <div className="wp-empty">Nema novih narudžbi.</div>}</div></section><section className="wp-section"><h2 className="wp-h2">Preuzete narudžbe</h2><div className="wp-grid">{claimedOrders.length ? claimedOrders.map((order) => card(order, true)) : <div className="wp-empty">Nema preuzetih narudžbi.</div>}</div></section></>}</div></main>;
}
