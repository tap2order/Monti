import { useEffect, useMemo, useRef, useState } from "react";
import { io } from "socket.io-client";
import { useNavigate } from "react-router-dom";
import "../css/WaiterPage.css";

export default function WaiterPage() {
  const api = import.meta.env.VITE_API_URL;
  const navigate = useNavigate();
  const socketRef = useRef(null);

  const orderSoundRef = useRef(null);
  const callSoundRef = useRef(null);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const soundEnabledRef = useRef(false);

  const originalTitleRef = useRef(document.title);
  const titleFlashIntervalRef = useRef(null);

  const startTitleFlash = (text = "🔔 Nova notifikacija") => {
    if (titleFlashIntervalRef.current) return;

    let showAlert = true;

    titleFlashIntervalRef.current = setInterval(() => {
      document.title = showAlert ? text : originalTitleRef.current;
      showAlert = !showAlert;
    }, 800);
  };

  const stopTitleFlash = () => {
    if (titleFlashIntervalRef.current) {
      clearInterval(titleFlashIntervalRef.current);
      titleFlashIntervalRef.current = null;
    }

    document.title = originalTitleRef.current;
  };

  const requestNotificationPermission = async () => {
    if (!("Notification" in window)) {
      console.log("Browser ne podržava notifikacije.");
      return;
    }

    if (Notification.permission === "default") {
      try {
        await Notification.requestPermission();
      } catch (e) {
        console.log("Notification permission failed:", e);
      }
    }
  };

  const showBrowserNotification = (title, body) => {
    if (!("Notification" in window)) return;
    if (Notification.permission !== "granted") return;

    try {
      new Notification(title, {
        body,
        icon: "/favicon.ico",
        badge: "/favicon.ico",
        requireInteraction: false,
      });
    } catch (e) {
      console.log("Show notification failed:", e);
    }
  };

  useEffect(() => {
    soundEnabledRef.current = soundEnabled;
  }, [soundEnabled]);

  useEffect(() => {
    requestNotificationPermission();
  }, []);

  useEffect(() => {
    const stopWhenUserReturns = () => {
      if (!document.hidden) {
        stopTitleFlash();
      }
    };

    document.addEventListener("visibilitychange", stopWhenUserReturns);
    window.addEventListener("focus", stopTitleFlash);

    return () => {
      document.removeEventListener("visibilitychange", stopWhenUserReturns);
      window.removeEventListener("focus", stopTitleFlash);
      stopTitleFlash();
    };
  }, []);

  useEffect(() => {
    const unlockAudio = () => {
      if (orderSoundRef.current) {
        orderSoundRef.current
          .play()
          .then(() => {
            orderSoundRef.current.pause();
            orderSoundRef.current.currentTime = 0;
          })
          .catch(() => {});
      }

      if (callSoundRef.current) {
        callSoundRef.current
          .play()
          .then(() => {
            callSoundRef.current.pause();
            callSoundRef.current.currentTime = 0;
          })
          .catch(() => {});
      }

      window.removeEventListener("click", unlockAudio);
      window.removeEventListener("touchstart", unlockAudio);
    };

    window.addEventListener("click", unlockAudio);
    window.addEventListener("touchstart", unlockAudio);

    return () => {
      window.removeEventListener("click", unlockAudio);
      window.removeEventListener("touchstart", unlockAudio);
    };
  }, []);

  const UNIVERSAL_WAITER_ID = 1;

  const [waiters, setWaiters] = useState([]);
  const [selectedWaiterId, setSelectedWaiterId] = useState(
    localStorage.getItem("selectedWaiterId") || ""
  );

  const [orders, setOrders] = useState([]);
  const [calls, setCalls] = useState([]);
  const [myOrders, setMyOrders] = useState([]);

  const [err, setErr] = useState("");
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [loadingCalls, setLoadingCalls] = useState(true);
  const [loadingMyOrders, setLoadingMyOrders] = useState(true);

  const waiterId = UNIVERSAL_WAITER_ID;

  const waiterName = useMemo(() => {
    const found = waiters.find((w) => String(w.id) === String(waiterId));
    return found?.name || "Hotel";
  }, [waiters, waiterId]);

  const hasWaiter = true;

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

  const loadWaiters = async () => {
    const res = await fetch(`${api}/waiters`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    setWaiters(data);

    if (!selectedWaiterId && data.length > 0) {
      const firstId = String(data[0].id);
      setSelectedWaiterId(firstId);
      localStorage.setItem("selectedWaiterId", firstId);
      return firstId;
    }

    return selectedWaiterId;
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

  const loadCalls = async (wid = selectedWaiterId) => {
    if (!wid) {
      setCalls([]);
      setLoadingCalls(false);
      return;
    }

    try {
      const res = await fetch(`${api}/calls/open`, {
        headers: { "X-Waiter-Id": String(wid) },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setCalls(data);
    } finally {
      setLoadingCalls(false);
    }
  };

  const loadMyOrders = async (wid = waiterId) => {
    if (!wid) {
      setMyOrders([]);
      setLoadingMyOrders(false);
      return;
    }

    try {
      const res = await fetch(`${api}/orders/claimed/${wid}`, {
        headers: { "X-Waiter-Id": String(wid) },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setMyOrders(data);
    } finally {
      setLoadingMyOrders(false);
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
      await loadMyOrders(waiterId);
    } catch (e) {
      setErr(e.message);
    }
  };

  useEffect(() => {
    setErr("");

    loadWaiters()
      .then((wid) => loadCalls(wid))
      .catch((e) => setErr(e.message));
    loadOrders().catch((e) => setErr(e.message));
    loadMyOrders(waiterId).catch(() => {});

    socketRef.current = io(api, { transports: ["websocket"] });
    const socket = socketRef.current;

    socket.on("connect", () => console.log("✅ waiter socket connected:", socket.id));

    socket.on("order:new", (order) => {
      setOrders((prev) => {
        if (prev.some((o) => o.id === order.id)) return prev;
        return [order, ...prev];
      });

      startTitleFlash("🔔 NOVA NARUDŽBA");

      showBrowserNotification(
        "Nova narudžba",
        `Stigla je nova narudžba za sobu ${order.tableId}.`
      );

      if (!soundEnabledRef.current) return;
      const a = orderSoundRef.current;
      if (!a) return;

      try {
        a.currentTime = 0;
      } catch {}
      a.play().catch(() => {
        try {
          window.navigator.vibrate?.(80);
        } catch {}
      });
    });

    socket.on("order:claimed", ({ orderId, waiterId: claimedBy }) => {
      setOrders((prev) => prev.filter((o) => o.id !== orderId));

      if (String(claimedBy) === String(waiterId)) {
        setLoadingMyOrders(true);
        loadMyOrders(claimedBy).catch(() => {});
      }
    });

    socket.on("order:deleted", ({ orderId }) => {
      setOrders((prev) => prev.filter((o) => o.id !== orderId));
      setMyOrders((prev) => prev.filter((o) => o.id !== orderId));
    });

    socket.on("call:new", (call) => {
      setCalls((prev) => [call, ...prev]);

      startTitleFlash("🔔 NOVI POZIV");

      showBrowserNotification(
        "Novi poziv",
        `Soba ${call.tableId} traži pomoć ili račun.`
      );

      if (soundEnabledRef.current) {
        callSoundRef.current?.play().catch(() => {
          try {
            window.navigator.vibrate?.(120);
          } catch {}
        });
      }
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
        loadMyOrders(waiterId).catch(() => {});
      }

      if (order.status === "COMPLETED") {
        setOrders((prev) => prev.filter((o) => o.id !== order.id));
        setMyOrders((prev) => prev.filter((o) => o.id !== order.id));
      }
    });

    socket.on("disconnect", () => console.log("❌ waiter socket disconnected"));

    return () => {
      socket.off("connect");
      socket.off("order:new");
      socket.off("order:claimed");
      socket.off("order:deleted");
      socket.off("call:new");
      socket.off("call:handled");
      socket.off("order:updated");
      socket.off("disconnect");
      socket.disconnect();
    };
  }, [api]);

  const claimOrder = async (orderId) => {
    setErr("");

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
      await loadMyOrders(waiterId);
    } catch (e) {
      setErr(e.message);
    }
  };

  const handleCall = async (callId) => {
    setErr("");

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
      const res = await fetch(`${api}/orders/${orderId}/complete`, {
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
      await loadMyOrders(waiterId);
    } catch (e) {
      setErr(e.message);
    }
  };

  return (
    <div className="wp-page">
      <div className="wp-shell">
        <div className="wp-top">
          <div className="wp-topMain">
            <div className="wp-titleRow">
              <h1 className="wp-title">Dashboard za osoblje</h1>
              <span className="wp-pill">{soundEnabled ? "Zvuk uključen" : "Zvuk isključen"}</span>
            </div>

            {/*  <div className="wp-topMeta">
              Aktivno osoblje: {waiterName || "Nije pronađeno aktivno osoblje"}
            </div> */}

            <div className="wp-actions">
              {/*  <button
                className="wp-btn wp-btn--ghost"
                onClick={() => orderSoundRef.current?.play().catch(() => {})}
              >
                Testiraj zvuk
              </button> */}

              <button className="wp-btn wp-btn--primary" onClick={toggleSound}>
                {soundEnabled ? "Isključi zvuk" : "Uključi zvuk"}
              </button>

              <button className="wp-btn wp-btn--ghost" onClick={requestNotificationPermission}>
                Dozvoli notifikacije
              </button>

              {/* <button
                className="wp-btn wp-btn--ghost"
                onClick={() => navigate("/pick-waiter", { state: { from: "/waiter" } })}
              >
                Otvori ličnu stranicu →
              </button> */}
            </div>
          </div>

          {/* <div className="wp-right">
            <span className="wp-label">Osoblje:</span>
            <select
              className="wp-select"
              value={selectedWaiterId}
              onChange={(e) => {
                const id = String(e.target.value);
                setSelectedWaiterId(id);
                localStorage.setItem("selectedWaiterId", id);
              }}
            >
              <option value="" disabled>
                Odaberite člana osoblja
              </option>
              {waiters.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </div> */}

          <audio ref={orderSoundRef} src="/sounds/new-order.mp3" preload="auto" />
          <audio ref={callSoundRef} src="/sounds/new-call.mp3" preload="auto" />
        </div>

        {/* {!hasWaiter && (
          <div className="wp-alert wp-alert--warn">
            <div className="wp-alertTitle">Aktivno osoblje nije pronađeno</div>
            <div className="wp-alertBody">
              Sistem koristi prvog aktivnog člana osoblja. Trenutno nema dostupnog aktivnog osoblja.
            </div>
          </div>
        )} */}

        {err && (
          <div className="wp-alert wp-alert--error">
            <div className="wp-alertTitle">Greška</div>
            <div className="wp-alertBody">{err}</div>
          </div>
        )}

        <div className="wp-section">
          <div className="wp-sectionHead">
            <h2 className="wp-h2">Pozivi</h2>
          </div>

          {loadingCalls ? (
            <div className="wp-empty">Učitavanje…</div>
          ) : calls.length === 0 ? (
            <div className="wp-empty">Nema otvorenih poziva.</div>
          ) : (
            <div className="wp-grid">
              {calls.map((c) => (
                <div key={c.id} className="wp-card">
                  <div className="wp-cardInner">
                    <div className="wp-cardTop">
                      <div>
                        <div className="wp-cardTitle">Soba {c.tableId}</div>
                        <div className="wp-meta">
                          {c.type === "bill" ? "Zahtjev za račun" : "Zahtjev za pomoć"}
                        </div>
                      </div>

                      <button onClick={() => handleCall(c.id)} className="wp-btn wp-btn--primary">
                        Obrađeno
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="wp-section">
          <div className="wp-sectionHead">
            <h2 className="wp-h2">Nove narudžbe</h2>
          </div>

          {loadingOrders ? (
            <div className="wp-empty">Učitavanje…</div>
          ) : orders.length === 0 ? (
            <div className="wp-empty">Nema novih narudžbi.</div>
          ) : (
            <div className="wp-grid">
              {orders.map((o) => (
                <div key={o.id} className="wp-card">
                  <div className="wp-cardInner">
                    <div className="wp-cardTop">
                      <div>
                        <div className="wp-cardTitle">Soba {o.tableId}</div>
                        <div className="wp-itemsCount">{o.items.length} stavki</div>
                      </div>

                      <button onClick={() => claimOrder(o.id)} className="wp-btn wp-btn--primary">
                        Preuzmi
                      </button>
                    </div>

                    <div className="wp-items">
                      {o.items.map((it) => (
                        <div key={it.itemId} className="wp-itemRow">
                          <div>
                            <div className="wp-itemName">
                              {it.name} × {it.qty}
                            </div>
                            {it.note ? <div className="wp-note">{it.note}</div> : null}
                          </div>
                          <div className="wp-itemPrice">{(it.price * it.qty).toFixed(2)} KM</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="wp-section">
          <div className="wp-sectionHead">
            <h2 className="wp-h2">Preuzete narudžbe</h2>
          </div>

          {loadingMyOrders ? (
            <div className="wp-empty">Učitavanje…</div>
          ) : myOrders.length === 0 ? (
            <div className="wp-empty">Nema preuzetih narudžbi.</div>
          ) : (
            <div className="wp-grid">
              {myOrders.map((o) => (
                <div key={o.id} className="wp-card">
                  <div className="wp-cardInner">
                    <div className="wp-cardTop">
                      <div>
                        <div className="wp-cardTitle">Soba {o.tableId}</div>
                        <div className="wp-itemsCount">{o.items.length} stavki</div>
                      </div>

                      <div className="wp-cardBtns">
                        <button onClick={() => finishOrder(o.id)} className="wp-btn wp-btn--success">
                          Završeno
                        </button>

                        {o.status === "CLAIMED" && (
                          <button onClick={() => unclaimOrder(o.id)} className="wp-btn wp-btn--danger">
                            Vrati
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="wp-items">
                      {o.items.map((it) => (
                        <div key={it.itemId} className="wp-itemRow">
                          <div>
                            <div className="wp-itemName">
                              {it.name} × {it.qty}
                            </div>
                            {it.note ? <div className="wp-note">{it.note}</div> : null}
                          </div>
                          <div className="wp-itemPrice">{(it.price * it.qty).toFixed(2)} KM</div>
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