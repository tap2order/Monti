import { useCallback, useEffect, useRef, useState } from "react";
import { BrowserQRCodeReader } from "@zxing/browser";
import { useParams, useSearchParams } from "react-router-dom";
import "../css/RoomChoicePage.css";

function cameraError(error) {
  if (!window.isSecureContext && location.hostname !== "localhost" && location.hostname !== "127.0.0.1") {
    return "Kamera zahtijeva HTTPS vezu.";
  }
  if (error?.name === "NotAllowedError") return "Pristup kameri nije dozvoljen.";
  if (error?.name === "NotFoundError") return "Kamera nije pronađena.";
  if (error?.name === "NotReadableError") return "Kamera je zauzeta drugom aplikacijom.";
  if (error?.name === "OverconstrainedError") return "Odabrana kamera ne podržava tražene postavke.";
  return "Kameru nije moguće pokrenuti.";
}

export default function RoomSessionGate({ children }) {
  const { tableId } = useParams();
  const [searchParams] = useSearchParams();
  const api = import.meta.env.VITE_API_URL || "";
  const qrToken = searchParams.get("token") || "";
  const [state, setState] = useState("restoring");
  const [message, setMessage] = useState("");
  const [needsReverify, setNeedsReverify] = useState(false);
  const videoRef = useRef(null);
  const controlsRef = useRef(null);
  const submittingRef = useRef(false);

  const stopCamera = useCallback(() => {
    controlsRef.current?.stop();
    controlsRef.current = null;
    const stream = videoRef.current?.srcObject;
    stream?.getTracks?.().forEach((track) => track.stop());
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const readStatus = useCallback(async () => {
    const response = await fetch(`${api}/api/guest/room-session`, { credentials: "include" });
    if (!response.ok) throw new Error("Status sesije nije moguće provjeriti.");
    const data = await response.json();
    if (data.status === "verified" && String(data.roomId) === String(tableId)) {
      setState("verified");
      setNeedsReverify(false);
      return "verified";
    }
    if (data.status === "verification_required" && String(data.roomId) === String(tableId)) {
      setState("verification_required");
      setNeedsReverify(false);
      return "verification_required";
    }
    setNeedsReverify(data.status === "expired" || data.status === "verified");
    setState("verification_required");
    return data.status;
  }, [api, tableId]);

  useEffect(() => {
    let active = true;
    async function restore() {
      try {
        if (qrToken) {
          const bootstrap = await fetch(`${api}/api/guest/room-session/bootstrap`, {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ roomId: tableId, token: qrToken }),
          });
          if (!bootstrap.ok) throw new Error("QR kod sobe nije važeći.");
          const saved = await readStatus();
          if (saved === "anonymous") throw new Error("Cookie sesije nije sačuvan. Provjerite postavke browsera.");
          if (saved === "verified") return;
          const clean = new URL(window.location.href);
          clean.searchParams.delete("token");
          window.history.replaceState({}, "", `${clean.pathname}${clean.search}${clean.hash}`);
        } else {
          await readStatus();
        }
      } catch (error) {
        if (active) {
          setState("verification_required");
          setNeedsReverify(true);
          setMessage(error.message === "Status sesije nije moguće provjeriti." ? "Cookie sesije nije sačuvan. Provjerite postavke browsera." : error.message);
        }
      }
    }
    restore();
    const lock = () => {
      stopCamera();
      sessionStorage.removeItem(`hotel_guest_cart_${tableId}`);
      setNeedsReverify(true);
      setState("verification_required");
      setMessage("Sesija je istekla. Ponovo skenirajte QR kod sobe.");
    };
    window.addEventListener("room-session-invalid", lock);
    return () => { active = false; stopCamera(); window.removeEventListener("room-session-invalid", lock); };
  }, [api, qrToken, tableId, readStatus, stopCamera]);

  const submitScan = useCallback(async (scannedValue) => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    stopCamera();
    setState("verifying");
    setMessage("");
    try {
      const endpoint = needsReverify ? "reverify" : "verify";
      const response = await fetch(`${api}/api/guest/room-session/${endpoint}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(needsReverify ? { roomId: tableId, scannedValue } : { scannedValue }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || "QR kod nije validan za ovu sobu.");
      if ((await readStatus()) !== "verified") throw new Error("Cookie sesije nije sačuvan. Provjerite postavke browsera.");
    } catch (error) {
      setMessage(error.message);
      setState("verification_required");
    } finally {
      submittingRef.current = false;
    }
  }, [api, needsReverify, readStatus, stopCamera, tableId]);

  const startCamera = async () => {
    if (!window.isSecureContext && location.hostname !== "localhost" && location.hostname !== "127.0.0.1") {
      setMessage("Kamera zahtijeva HTTPS vezu.");
      return;
    }
    setState("requesting_camera");
    setMessage("");
    const reader = new BrowserQRCodeReader();
    try {
      let controls;
      try {
        controls = await reader.decodeFromConstraints(
          { audio: false, video: { facingMode: { ideal: "environment" } } },
          videoRef.current,
          (result) => result && submitScan(result.getText())
        );
      } catch (error) {
        if (!["OverconstrainedError", "NotFoundError"].includes(error?.name)) throw error;
        controls = await reader.decodeFromConstraints(
          { audio: false, video: true },
          videoRef.current,
          (result) => result && submitScan(result.getText())
        );
      }
      controlsRef.current = controls;
      setState("scanning");
    } catch (error) {
      stopCamera();
      setMessage(cameraError(error));
      setState("verification_required");
    }
  };

  if (state === "verified") return children;

  return (
    <div className="choicePage">
      <div className="choiceCard">
        <p className="choiceEyebrow">ROOM SERVICE</p>
        <h1 className="choiceTitle">
          {state === "restoring" ? "Provjera sesije…" : state === "verifying" ? "Provjera QR koda…" : "Potvrdite sobu"}
        </h1>
        <p className="choiceSubtitle">
          {message || "Ponovo skenirajte fizički QR kod u sobi da biste pristupili Room Serviceu."}
        </p>
        <video ref={videoRef} muted playsInline style={{ width: "100%", borderRadius: 16, display: ["requesting_camera", "scanning"].includes(state) ? "block" : "none" }} />
        {!["restoring", "verifying", "scanning"].includes(state) && (
          <button type="button" className="choiceOption" onClick={startCamera}>
            <span className="choiceOptionLabel">Pokreni kameru</span>
            <span className="choiceOptionText">Skenirajte QR kod ove sobe.</span>
          </button>
        )}
        {state === "scanning" && <p className="choiceSubtitle">Usmjerite kameru prema QR kodu…</p>}
      </div>
    </div>
  );
}
