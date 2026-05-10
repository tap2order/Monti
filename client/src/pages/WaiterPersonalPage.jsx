import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { useParams, Link } from "react-router-dom";
import "../css/WaiterPersonalPage.css";

export default function WaiterPersonalPage() {
  const api = import.meta.env.VITE_API_URL;
  const socketRef = useRef(null);

  const { waiterId } = useParams();

  const [orders, setOrders] = useState([]);
  const [calls, setCalls] = useState([]);
  const [myOrders, setMyOrders] = useState([]);

  const [err, setErr] = useState("");
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [loadingCalls, setLoadingCalls] = useState(true);
  const [loadingMyOrders, setLoadingMyOrders] = useState(true);

  const [waiterInfo, setWaiterInfo] = useState(null);
  const [loadingWaiter, setLoadingWaiter] = useState(true);

  // SOUNDS
  const orderSoundRef = useRef(null);
  const callSoundRef = useRef(null);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const soundEnabledRef = useRef(false);

  useEffect(() => {
    soundEnabledRef.current = soundEnabled;
  }, [soundEnabled]);

  const toggleSound = async () => {
    if (soundEnabledRef.current) {
      setSoundEnabled(false);
      return;
    }
    try {
      const a = orderSoundRef.current;
      if (!a) return;

      a.muted = true;
      await a.play();
      a.pause();
      a.currentTime = 0;
      a.muted = false;

      setSoundEnabled(true);
    } catch (e) {
      console.log("Enable sound failed:", e);
    }
  };

  const loadWaiter = async () => {
    setLoadingWaiter(true);
    try {
      const res = await fetch(`${api}/waiters/${waiterId}`);
      const text = await res.text();
      if (!res.ok) throw new Error(text || `HTTP ${res.status}`);
      const data = JSON.parse(text);
      setWaiterInfo(data);
    } finally {
      setLoadingWaiter(false);
    }
  };

  const loadOrders = async () => {
    try {
      const res = await fetch(`${api}/orders/unclaimed`, {
        headers: { "X-Waiter-Id": String(waiterId) },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setOrders(data);
    } finally {
      setLoadingOrders(false);
    }
  };

  const loadCalls = async () => {
    if (!waiterId) {
      setCalls([]);
      setLoadingCalls(false);
      return;
    }

    try {
      const res = await fetch(`${api}/calls/open`, {
        headers: { "X-Waiter-Id": String(waiterId) },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setCalls(data);
    } finally {
      setLoadingCalls(false);
    }
  };

  const loadMyOrders = async () => {
    if (!waiterId) {
      setMyOrders([]);
      setLoadingMyOrders(false);
      return;
    }
    try {
      const res = await fetch(`${api}/orders/claimed/${waiterId}`, {
        headers: { "X-Waiter-Id": String(waiterId) },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setMyOrders(data);
    } finally {
      setLoadingMyOrders(false);
    }
  };

  useEffect(() => {
    setErr("");

    setLoadingOrders(true);
    setLoadingCalls(true);
    setLoadingMyOrders(true);

    loadOrders().catch((e) => setErr(e.message));
    loadCalls().catch(() => {});
    loadMyOrders().catch(() => {});
    loadWaiter().catch((e) => setErr(e.message));

    socketRef.current = io(api, { transports: ["websocket"] });
    const socket = socketRef.current;

    socket.on("connect", () => {
      console.log("✅ personal waiter socket connected:", socket.id, "waiterId:", waiterId);
    });

    socket.on("order:new", (order) => {
      setOrders((prev) => {
        if (prev.some((o) => o.id === order.id)) return prev;
        return [order, ...prev];
      });

      if (!soundEnabledRef.current) return;
      const a = orderSoundRef.current;
      if (!a) return;
      try { a.currentTime = 0; } catch {}
      a.play().catch(() => {
        try { window.navigator.vibrate?.(80); } catch {}
      });
    });

    socket.on("order:claimed", ({ orderId, waiterId: claimedBy }) => {
      setOrders((prev) => prev.filter((o) => o.id !== orderId));
      if (String(claimedBy) === String(waiterId)) {
        setLoadingMyOrders(true);
        loadMyOrders().catch(() => {});
      }
    });

    socket.on("order:deleted", ({ orderId }) => {
      setOrders((prev) => prev.filter((o) => o.id !== orderId));
      setMyOrders((prev) => prev.filter((o) => o.id !== orderId));
    });

    socket.on("call:new", (call) => {
      setCalls((prev) => [call, ...prev]);

      if (!soundEnabledRef.current) return;
      const a = callSoundRef.current;
      if (!a) return;
      try { a.currentTime = 0; } catch {}
      a.play().catch(() => {
        try { window.navigator.vibrate?.(120); } catch {}
      });
    });

    socket.on("call:handled", ({ callId }) => {
      setCalls((prev) => prev.filter((c) => c.id !== callId));
    });

    socket.on("order:updated", (order) => {
      if (order.status === "UNCLAIMED") {
        setOrders((prev) => {
          if (prev.some((o) => o.id === order.id)) return prev;
          return [order, ...prev];
        });
        setMyOrders((prev) => prev.filter((o) => o.id !== order.id));
      }

      if (order.status === "CLAIMED" && String(order.claimedById) === String(waiterId)) {
        setLoadingMyOrders(true);
        loadMyOrders().catch(() => {});
      }
    });

    socket.on("disconnect", () => {
      console.log("❌ personal waiter socket disconnected");
    });

    return () => {
      socket.off("connect");
      socket.off("order:new");
      socket.off("order:claimed");
      socket.off("order:deleted");
      socket.off("call:new");
      socket.off("call:handled");
      socket.off("disconnect");
      socket.off("order:updated");
      socket.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api, waiterId]);

  const claimOrder = async (orderId) => {
    setErr("");
    if (!waiterId) return setErr("Nedostaje waiterId u URL-u.");

    try {
      const res = await fetch(`${api}/orders/${orderId}/claim`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "X-Waiter-Id": String(waiterId),
        },
        body: JSON.stringify({ waiterId }),
      });

      const text = await res.text();
      if (!res.ok) throw new Error(text || `HTTP ${res.status}`);

      setLoadingMyOrders(true);
      loadMyOrders().catch(() => {});
    } catch (e) {
      setErr(e.message);
    }
  };

  const handleCall = async (callId) => {
    setErr("");
    if (!waiterId) return setErr("Nedostaje waiterId u URL-u.");

    try {
      const res = await fetch(`${api}/calls/${callId}/handle`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "X-Waiter-Id": String(waiterId),
        },
        body: JSON.stringify({ waiterId }),
      });

      const text = await res.text();
      if (!res.ok) throw new Error(text || `HTTP ${res.status}`);
    } catch (e) {
      setErr(e.message);
    }
  };

  const finishOrder = async (orderId) => {
    setErr("");
    try {
      const res = await fetch(`${api}/orders/${orderId}`, {
        method: "DELETE",
        headers: { "X-Waiter-Id": String(waiterId) },
      });
      const text = await res.text();
      if (!res.ok) throw new Error(text || `HTTP ${res.status}`);
    } catch (e) {
      setErr(e.message);
    }
  };

  const unclaimOrder = async (orderId) => {
    setErr("");
    try {
      const res = await fetch(`${api}/orders/${orderId}/unclaim`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Waiter-Id": String(waiterId),
        },
        body: JSON.stringify({ waiterId }),
      });

      const text = await res.text();
      if (!res.ok) throw new Error(text || `HTTP ${res.status}`);

      setLoadingMyOrders(true);
      await loadMyOrders();
    } catch (e) {
      setErr(e.message);
    }
  };

  // Guards
  if (loadingWaiter) {
    return (
      <div className="wpp-page">
        <div className="wpp-shell">
          <div className="wpp-section">
            <div className="wpp-subText">Učitavanje stranice osoblja…</div>
          </div>
        </div>
      </div>
    );
  }

  if (!waiterInfo || waiterInfo.isActive === false) {
    return (
      <div className="wpp-page">
        <div className="wpp-shell">
          <div className="wpp-section">
            <h2 className="wpp-h2">Član osoblja nije pronađen</h2>
            <p className="wpp-subText">Ovaj ID osoblja nije važeći.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="wpp-page">
      <div className="wpp-shell">
        <div className="wpp-top">
          <div>
            <h1 className="wpp-title">Kontrolna ploča osoblja</h1>

            <div className="wpp-actions" style={{ justifyContent: "flex-start" }}>
              <button
                onClick={toggleSound}
                className={
                  "wpp-btn " + (soundEnabled ? "wpp-btn--soundOn" : "wpp-btn--primary")
                }
              >
                {soundEnabled ? "Zvuk ✅" : "Uključi zvuk"}
              </button>

              <audio ref={orderSoundRef} src="/sounds/new-order.mp3" preload="auto" />
              <audio ref={callSoundRef} src="/sounds/new-call.mp3" preload="auto" />
            </div>

            <div className="wpp-sub">
              Lična kontrolna ploča za osoblje ID: <b>{waiterId}</b>
            </div>
          </div>

          <div className="wpp-actions">
            <Link to="/pick-waiter" className="wpp-linkBtn wpp-linkBtn--light">
              ← Promijeni člana osoblja
            </Link>

            <Link to="/waiter" className="wpp-linkBtn wpp-linkBtn--primary">
              Glavna kontrolna ploča
            </Link>
          </div>
        </div>

        {err && (
          <div className="wpp-alert wpp-alert--error">
            <div className="wpp-alertTitle">Greška</div>
            <div className="wpp-alertBody">{err}</div>
          </div>
        )}

        {/* CALLS */}
        <div className="wpp-section">
          <h2 className="wpp-h2">Zahtjevi gostiju</h2>

          {loadingCalls ? (
            <div className="wpp-subText">Učitavanje zahtjeva gostiju…</div>
          ) : calls.length === 0 ? (
            <div className="wpp-subText">Nema otvorenih zahtjeva gostiju.</div>
          ) : (
            <div className="wpp-grid">
              {calls.map((c) => (
                <div key={c.id} className="wpp-card">
                  <div className="wpp-cardInner">
                    <div className="wpp-cardTop">
                      <div>
                        <div className="wpp-cardTitle">
                          Soba {c.tableId} — {c.type === "bill" ? "🧾 Zahtjev za račun" : "🔔 Zahtjev za pomoć"}
                        </div>
                        <div className="wpp-meta">{new Date(c.createdAt).toLocaleString()}</div>
                      </div>

                      <button onClick={() => handleCall(c.id)} className="wpp-btn wpp-btn--primary">
                        Obrađeno
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* UNCLAIMED */}
        <div className="wpp-section">
          <h2 className="wpp-h2">Otvorene room service narudžbe</h2>
          <p className="wpp-subText">
            Ove narudžbe su vidljive svom osoblju. Kliknite <b>Preuzmi</b> da preuzmete odgovornost.
          </p>

          {loadingOrders ? (
            <div className="wpp-subText">Učitavanje room service narudžbi…</div>
          ) : orders.length === 0 ? (
            <div className="wpp-subText">Nema otvorenih room service narudžbi.</div>
          ) : (
            <div className="wpp-grid">
              {orders.map((o) => (
                <div key={o.id} className="wpp-card">
                  <div className="wpp-cardInner">
                    <div className="wpp-cardTop">
                      <div>
                        <div className="wpp-cardTitle">Soba {o.tableId}</div>
                        <div className="wpp-meta">{new Date(o.createdAt).toLocaleString()}</div>
                        <div className="wpp-meta">ID narudžbe: {o.id}</div>
                      </div>

                      <button onClick={() => claimOrder(o.id)} className="wpp-btn wpp-btn--primary">
                        Preuzmi
                      </button>
                    </div>

                    <div className="wpp-items">
                      {o.items.map((it) => (
                        <div key={it.itemId} className="wpp-itemRow">
                          <div>
                            <div className="wpp-itemName">
                              {it.name} × {it.qty}
                            </div>
                            {it.note ? <div className="wpp-note">Napomena: {it.note}</div> : null}
                          </div>
                          <div>{(it.price * it.qty).toFixed(2)} KM</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* MY ORDERS */}
        <div className="wpp-section">
          <h2 className="wpp-h2">Moje dodijeljene narudžbe</h2>

          {loadingMyOrders ? (
            <div className="wpp-subText">Učitavanje dodijeljenih narudžbi…</div>
          ) : myOrders.length === 0 ? (
            <div className="wpp-subText">Još nema dodijeljenih narudžbi.</div>
          ) : (
            <div className="wpp-grid">
              {myOrders.map((o) => (
                <div key={o.id} className="wpp-card">
                  <div className="wpp-cardInner">
                    <div className="wpp-cardTop">
                      <div>
                        <div className="wpp-cardTitle">Soba {o.tableId}</div>
                        <div className="wpp-meta">
                          Preuzeto u {o.claimedAt ? new Date(o.claimedAt).toLocaleString() : "—"}
                        </div>
                        <div className="wpp-meta">ID narudžbe: {o.id}</div>
                      </div>

                      <div className="wpp-btnRow">
                        <button onClick={() => finishOrder(o.id)} className="wpp-btn wpp-btn--success">
                          Završeno
                        </button>
                        {o.status === "CLAIMED" && (
                          <button onClick={() => unclaimOrder(o.id)} className="wpp-btn wpp-btn--danger">
                            Vrati
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="wpp-items">
                      {o.items.map((it) => (
                        <div key={it.itemId} className="wpp-itemRow">
                          <div>
                            <div className="wpp-itemName">
                              {it.name} × {it.qty}
                            </div>
                            {it.note ? <div className="wpp-note">Napomena: {it.note}</div> : null}
                          </div>
                          <div>{(it.price * it.qty).toFixed(2)} KM</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
