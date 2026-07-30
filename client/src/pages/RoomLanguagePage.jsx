import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { PoweredByFooter, PrimaryMenuCard, QuickInfoPanel, ServiceActionCards, WelcomeHero } from "../components/GuestWelcome";
import { GUEST_HOTEL_CONFIG } from "../guestHotelConfig";
import { GUEST_WELCOME_COPY } from "../guestWelcomeContent";
import { fetchIgmanWeather } from "../igmanWeather";
import { useRoomDisplayName } from "../roomDisplay";
import "../css/RoomChoicePage.css";

function Dialog({ title, onClose, children }) {
  const closeRef = useRef(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKeyDown = (event) => event.key === "Escape" && onClose();
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div
      className="welcomeModalOverlay"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <section className="welcomeModal" role="dialog" aria-modal="true" aria-labelledby="guest-dialog-title">
        <button ref={closeRef} className="welcomeModalClose" type="button" onClick={onClose} aria-label={title}>
          ×
        </button>
        <h2 id="guest-dialog-title">{title}</h2>
        {children}
      </section>
    </div>
  );
}

export default function RoomLanguagePage() {
  const navigate = useNavigate();
  const { tableId } = useParams();
  const roomDisplayName = useRoomDisplayName();
  const [searchParams, setSearchParams] = useSearchParams();
  const urlLang = searchParams.get("lang");
  const savedLang = localStorage.getItem("guest-language");
  const [lang, setLang] = useState(GUEST_WELCOME_COPY[urlLang] ? urlLang : (GUEST_WELCOME_COPY[savedLang] ? savedLang : "bs"));
  const [modal, setModal] = useState(null);
  const [weather, setWeather] = useState({ status: "loading" });
  const [message, setMessage] = useState("");
  const [callError, setCallError] = useState("");
  const [calling, setCalling] = useState(false);
  const [notice, setNotice] = useState("");
  const t = GUEST_WELCOME_COPY[lang];
  const api = import.meta.env.VITE_API_URL || "";

  useEffect(() => {
    localStorage.setItem("guest-language", lang);
    const params = new URLSearchParams(searchParams);
    params.set("lang", lang);
    params.delete("view");
    setSearchParams(params, { replace: true });
    // Language changes are the only trigger; searchParams is deliberately not one.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang, setSearchParams]);

  useEffect(() => {
    const controller = new AbortController();
    fetchIgmanWeather(controller.signal)
      .then((data) => setWeather({ status: "ready", ...data }))
      .catch((error) => {
        if (error.name !== "AbortError") setWeather({ status: "error" });
      });
    return () => controller.abort();
  }, []);

  const callStaff = async (event) => {
    event.preventDefault();
    if (message.trim().length < 3) {
      setCallError(t.required);
      return;
    }
    setCalling(true);
    setCallError("");
    try {
      const response = await fetch(`${api}/calls`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ type: "waiter", message: message.trim() }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.code);
      }
      setMessage("");
      setModal(null);
      setNotice(t.called);
    } catch (error) {
      setCallError(error.message === "STAFF_CALL_COOLDOWN" ? t.cooldown : t.callError);
    } finally {
      setCalling(false);
    }
  };

  const copyPassword = async () => {
    try {
      await navigator.clipboard.writeText(GUEST_HOTEL_CONFIG.wifi.password);
      setNotice(t.passwordCopied);
    } catch {
      setNotice(t.copyError);
    }
  };

  const openServices = () => navigate(`/t/${tableId}/services?lang=${lang}`);
  const openCall = () => { setCallError(""); setModal("call"); };

  return (
    <main className="welcomePage" dir={lang === "ar" ? "rtl" : "ltr"}>
      <div className="welcomeShell">
        <WelcomeHero lang={lang} onLanguageChange={setLang} t={t} roomDisplayName={roomDisplayName} tableId={tableId} />
        <QuickInfoPanel t={t} weather={weather} onCopyPassword={copyPassword} />
        {notice && <div className="welcomeToast" role="status">{notice}</div>}
        <section className="welcomeSection restaurantSection" aria-labelledby="restaurant-title">
          <h2 id="restaurant-title">{t.restaurantRoomService}</h2>
          <PrimaryMenuCard t={t} onClick={() => navigate(`/t/${tableId}/menu?lang=${lang}`)} />
        </section>
        <ServiceActionCards t={t} onOpenServices={openServices} onOpenCall={openCall} />
        <PoweredByFooter t={t} />
      </div>

      {modal === "call" && (
        <Dialog title={t.call} onClose={() => !calling && setModal(null)}>
          <p>{t.callInfo}</p>
          <form onSubmit={callStaff}>
            <label className="welcomeModalField">
              <span className="srOnly">{t.call}</span>
              <textarea autoFocus maxLength="500" value={message} placeholder={t.placeholder} onChange={(event) => { setMessage(event.target.value); setCallError(""); }} />
            </label>
            {callError && <div className="welcomeToast welcomeToast--error" role="alert">{callError}</div>}
            <div className="welcomeModalActions">
              <button className="welcomeModalCancel" type="button" onClick={() => setModal(null)}>{t.cancel}</button>
              <button className="welcomeModalSend" disabled={calling}>{calling ? t.sending : t.send}</button>
            </div>
          </form>
        </Dialog>
      )}
    </main>
  );
}
