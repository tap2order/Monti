import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { BrowserQRCodeReader } from "@zxing/browser";
import { Camera, CircleHelp, RefreshCw } from "lucide-react";
import { confirmGuestRoomSession, guestFetch, guestJson } from "../guestSession";
import { getBilingualCameraText, getGuestVerificationText } from "../guestVerificationText";
import {
  CAMERA_CONSTRAINTS,
  CAMERA_FALLBACK_CONSTRAINTS,
  cameraErrorKind,
  cameraGuideKind,
  queryCameraPermission,
  stopMediaStream,
} from "../cameraRecovery";
import "./RoomSessionGate.css";

const BILINGUAL_CAMERA_TEXT = getBilingualCameraText();

export default function RoomSessionGate({ children }) {
  const { tableId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const locationRef = useRef(location);
  const videoRef = useRef(null);
  const controlsRef = useRef(null);
  const submittedRef = useRef(false);
  const scanActiveRef = useRef(false);
  const startingRef = useRef(false);
  const mountedRef = useRef(true);
  const expiryTimerRef = useRef(null);
  const [state, setState] = useState("restoring");
  const [message, setMessage] = useState("");
  const [canScan, setCanScan] = useState(false);
  const [reverify, setReverify] = useState(false);
  const [cameraStartRequired, setCameraStartRequired] = useState(false);
  const [cameraIssue, setCameraIssue] = useState("");
  const [showInstructions, setShowInstructions] = useState(false);
  const [permissionState, setPermissionState] = useState("unknown");
  const requestedLanguage = new URLSearchParams(location.search).get("lang") || "bs";
  const language = ["bs", "en", "de", "tr", "ar"].includes(requestedLanguage) ? requestedLanguage : "bs";
  const text = getGuestVerificationText(language);

  useEffect(() => { locationRef.current = location; }, [location]);

  const stopScanner = useCallback(() => {
    scanActiveRef.current = false;
    controlsRef.current?.stop();
    controlsRef.current = null;
    const stream = videoRef.current?.srcObject;
    stopMediaStream(stream);
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const clearExpiryTimer = useCallback(() => {
    if (expiryTimerRef.current) clearTimeout(expiryTimerRef.current);
    expiryTimerRef.current = null;
  }, []);

  const scheduleExpiryLock = useCallback((expiresInSeconds) => {
    clearExpiryTimer();
    if (!Number.isFinite(expiresInSeconds) || expiresInSeconds <= 0) return;
    expiryTimerRef.current = setTimeout(() => {
      stopScanner();
      setState("verification_required");
      setCanScan(true);
      setReverify(true);
      setMessage(BILINGUAL_CAMERA_TEXT.expired);
      setCameraStartRequired(true);
    }, expiresInSeconds * 1000);
  }, [clearExpiryTimer, stopScanner]);

  const restore = useCallback(async ({ expiredMessage = "" } = {}) => {
    setState("restoring");
    setMessage(expiredMessage);
    setCanScan(false);
    setReverify(false);
    setCameraStartRequired(false);
    setCameraIssue("");
    setShowInstructions(false);
    clearExpiryTimer();
    const currentLocation = locationRef.current;
    const params = new URLSearchParams(currentLocation.search);
    const token = params.get("token") || params.get("code");
    try {
      let payload;
      if (token) {
        const response = await guestFetch("/api/guest/room-session/bootstrap", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ roomId: tableId, token }),
        });
        payload = await guestJson(response);
        if (!response.ok) throw new Error("bootstrap");
        const confirmed = await confirmGuestRoomSession();
        if (!confirmed.response.ok || !["verification_required", "verified"].includes(confirmed.payload?.status)) {
          throw new Error("cookie_not_persisted");
        }
        payload = confirmed.payload;
        params.delete("token");
        params.delete("code");
        navigate({ pathname: currentLocation.pathname, search: params.toString() ? `?${params}` : "" }, { replace: true });
      } else {
        const confirmed = await confirmGuestRoomSession();
        if (!confirmed.response.ok) throw new Error("session_status");
        payload = confirmed.payload;
      }
      if (payload?.status === "verified" && String(payload.roomId) === String(tableId)) {
        setState("verified");
        scheduleExpiryLock(payload.expiresInSeconds);
      } else if (payload?.status === "expired") {
        setState("verification_required");
        setMessage(BILINGUAL_CAMERA_TEXT.expired);
        setCanScan(true);
        setReverify(true);
        setCameraStartRequired(true);
      } else {
        setState("verification_required");
        setCanScan(true);
        setReverify(payload?.status !== "verification_required");
        setCameraStartRequired(true);
      }
    } catch {
      setState("verification_required");
      setCanScan(true);
      setReverify(true);
      setMessage(BILINGUAL_CAMERA_TEXT.sessionError);
      setCameraStartRequired(true);
    }
  }, [clearExpiryTimer, navigate, scheduleExpiryLock, tableId]);

  useEffect(() => { restore(); }, [restore]);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      stopScanner();
      clearExpiryTimer();
    };
  }, [clearExpiryTimer, stopScanner]);
  useEffect(() => {
    const onInvalid = (event) => {
      stopScanner();
      clearExpiryTimer();
      sessionStorage.removeItem(`hotel_guest_cart_${tableId}`);
      setState("verification_required");
      const expired = event.detail?.code === "ROOM_SESSION_EXPIRED";
      setCanScan(true);
      setReverify(true);
      setCameraStartRequired(true);
      setCameraIssue("");
      setMessage(expired ? BILINGUAL_CAMERA_TEXT.expired : BILINGUAL_CAMERA_TEXT.instruction);
    };
    window.addEventListener("guest-room-session-invalid", onInvalid);
    return () => window.removeEventListener("guest-room-session-invalid", onInvalid);
  }, [clearExpiryTimer, stopScanner, tableId, text.expired, text.instruction]);

  const submitScan = useCallback(async (scannedValue) => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    stopScanner();
    setState("verifying");
    try {
      const response = await guestFetch(reverify ? "/api/guest/room-session/reverify" : "/api/guest/room-session/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reverify ? { roomId: tableId, scannedValue } : { scannedValue }),
      });
      const payload = await guestJson(response);
      if (!response.ok) {
        setState("verification_required");
        setCanScan(true);
        setCameraStartRequired(true);
        setMessage(payload?.code === "WRONG_ROOM_QR" ? BILINGUAL_CAMERA_TEXT.wrongRoom : BILINGUAL_CAMERA_TEXT.invalidQr);
        return;
      }
      const confirmed = await confirmGuestRoomSession();
      if (!confirmed.response.ok || confirmed.payload?.status !== "verified" || String(confirmed.payload.roomId) !== String(tableId)) {
        setState("verification_required");
        setCanScan(true);
        setCameraStartRequired(true);
        setMessage(BILINGUAL_CAMERA_TEXT.cookieError);
        return;
      }
      setState("verified");
      setMessage(BILINGUAL_CAMERA_TEXT.confirmed);
      scheduleExpiryLock(confirmed.payload.expiresInSeconds);
    } catch {
      setState("verification_required");
      setCanScan(true);
      setCameraStartRequired(true);
      setMessage(BILINGUAL_CAMERA_TEXT.invalidQr);
    } finally {
      submittedRef.current = false;
    }
  }, [reverify, scheduleExpiryLock, stopScanner, tableId]);

  const startScanner = useCallback(async () => {
    if (scanActiveRef.current || startingRef.current) return;
    startingRef.current = true;
    stopScanner();
    setCameraIssue("");
    setShowInstructions(false);
    if (!window.isSecureContext && window.location.hostname !== "localhost") {
      setState("verification_required");
      setCameraStartRequired(true);
      setMessage(BILINGUAL_CAMERA_TEXT.httpsBody);
      setCameraIssue("https");
      startingRef.current = false;
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setState("verification_required");
      setCameraStartRequired(true);
      setMessage(BILINGUAL_CAMERA_TEXT.unavailableBody);
      setCameraIssue("unavailable");
      startingRef.current = false;
      return;
    }
    submittedRef.current = false;
    scanActiveRef.current = true;
    setCameraStartRequired(false);
    setMessage("");
    setState("requesting_camera");
    try {
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia(CAMERA_CONSTRAINTS);
      } catch (error) {
        if (cameraErrorKind(error) !== "overconstrained") throw error;
        stream = await navigator.mediaDevices.getUserMedia(CAMERA_FALLBACK_CONSTRAINTS);
      }
      if (!mountedRef.current || !scanActiveRef.current) {
        stopMediaStream(stream);
        return;
      }
      if (videoRef.current) videoRef.current.srcObject = stream;
      const reader = new BrowserQRCodeReader();
      const controls = await reader.decodeFromStream(
        stream,
        videoRef.current,
        (result) => { if (result) submitScan(result.getText()); }
      );
      if (!scanActiveRef.current || submittedRef.current) {
        controls.stop();
        return;
      }
      controlsRef.current = controls;
      setPermissionState("granted");
      setState("scanning");
      setMessage(BILINGUAL_CAMERA_TEXT.ready);
    } catch (error) {
      stopScanner();
      setState("verification_required");
      setCameraStartRequired(true);
      const issue = cameraErrorKind(error);
      setCameraIssue(issue);
      if (issue === "denied") {
        setPermissionState("denied");
        setMessage(BILINGUAL_CAMERA_TEXT.blockedBody);
      } else if (issue === "not_found") {
        setMessage(BILINGUAL_CAMERA_TEXT.notFoundBody);
      } else if (issue === "in_use") {
        setMessage(BILINGUAL_CAMERA_TEXT.inUseBody);
      } else {
        setMessage(BILINGUAL_CAMERA_TEXT.unavailableBody);
      }
    } finally {
      startingRef.current = false;
    }
  }, [stopScanner, submitScan]);

  useEffect(() => {
    const refreshPermission = async () => {
      const next = await queryCameraPermission();
      if (!mountedRef.current) return;
      setPermissionState(next);
      if (next === "granted" && cameraIssue === "denied") {
        setCameraIssue("");
        setMessage("");
        setCameraStartRequired(true);
      }
    };
    const onVisibility = () => { if (document.visibilityState === "visible") refreshPermission(); };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pageshow", refreshPermission);
    window.addEventListener("focus", refreshPermission);
    refreshPermission();
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pageshow", refreshPermission);
      window.removeEventListener("focus", refreshPermission);
    };
  }, [cameraIssue]);

  if (state === "verified") return children;
  const scanning = state === "scanning" || state === "requesting_camera" || state === "verifying";
  const waiting = state === "restoring" || state === "requesting_camera" || state === "verifying";
  const showScanner = canScan || scanning;
  const recovery = BILINGUAL_CAMERA_TEXT;
  const guide = recovery.guides[cameraGuideKind(navigator.userAgent)] || recovery.guides.generic;
  const issueTitle = cameraIssue === "denied" ? recovery.blockedTitle
    : cameraIssue === "not_found" ? recovery.notFoundTitle
    : cameraIssue === "in_use" ? recovery.inUseTitle
    : cameraIssue === "https" ? recovery.httpsTitle
    : recovery.unavailableTitle;
  return (
    <main className="guestVerificationPage" data-camera-permission={permissionState}>
      <section className={`guestVerificationCard${scanning ? " guestVerificationCard--scanning" : ""}`} aria-live="polite" dir={language === "ar" ? "rtl" : "ltr"}>
        <header className="guestVerificationHeader">
          <p className="guestVerificationEyebrow">{text.brand}</p>
          <h1>{recovery.title}</h1>
          <p className="guestVerificationIntro">{recovery.instruction}</p>
        </header>

        {message && !cameraIssue && <p className="guestVerificationAlert" role="alert">{message}</p>}

        {state === "restoring" && <div className="guestVerificationLoading" role="status">
          <span className="guestVerificationSpinner" aria-hidden="true" />
          <span>{recovery.restoring}</span>
        </div>}

        {cameraIssue && <section className="guestCameraRecovery" aria-labelledby="camera-recovery-title">
          <Camera size={34} aria-hidden="true" />
          <h2 id="camera-recovery-title">{issueTitle}</h2>
          <p>{message}</p>
          {cameraIssue === "denied" && <button className="guestVerificationButton guestVerificationButton--secondary" type="button" onClick={() => setShowInstructions((value) => !value)}>
            <CircleHelp size={18} aria-hidden="true" />{showInstructions ? recovery.hideInstructions : recovery.showInstructions}
          </button>}
          {showInstructions && <ol className="guestCameraInstructions">{guide.map((step) => <li key={step}>{step}</li>)}</ol>}
          <div className="guestCameraRecoveryActions">
            <button className="guestVerificationButton guestVerificationButton--primary" type="button" disabled={state === "requesting_camera"} onClick={startScanner}>
              <RefreshCw size={18} aria-hidden="true" />{recovery.retry}
            </button>
          </div>
        </section>}

        {!cameraIssue && showScanner && <div className="guestScannerBlock">
          <div className={`guestScannerFrame${state === "scanning" ? " guestScannerFrame--active" : ""}`}>
            <video ref={videoRef} playsInline muted className="guestScannerVideo" />
            <span className="guestScannerCorner guestScannerCorner--topLeft" aria-hidden="true" />
            <span className="guestScannerCorner guestScannerCorner--topRight" aria-hidden="true" />
            <span className="guestScannerCorner guestScannerCorner--bottomLeft" aria-hidden="true" />
            <span className="guestScannerCorner guestScannerCorner--bottomRight" aria-hidden="true" />
            {state === "scanning" && <span className="guestScannerLine" aria-hidden="true" />}
            {waiting && <span className="guestScannerStatus"><span className="guestVerificationSpinner" aria-hidden="true" /></span>}
            {!scanning && cameraStartRequired && <button className="guestScannerStartButton" type="button" onClick={startScanner}><Camera size={19} aria-hidden="true" /><span>{recovery.enableAndScan}</span></button>}
            {!scanning && !cameraStartRequired && <span className="guestScannerStatus"><span className="guestVerificationSpinner" aria-hidden="true" /></span>}
          </div>
          <p className="guestScannerInstruction">{state === "requesting_camera" ? recovery.starting : state === "verifying" ? recovery.verifying : state === "scanning" ? recovery.ready : recovery.instruction}</p>
          {scanning && state !== "verifying" && <button className="guestVerificationButton guestVerificationButton--secondary" type="button" onClick={() => { stopScanner(); setState("verification_required"); setCameraStartRequired(true); }}>{recovery.cancel}</button>}
        </div>}
      </section>
    </main>
  );
}
