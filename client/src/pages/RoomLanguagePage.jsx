import { useEffect, useRef, useState } from "react";
import { BriefcaseBusiness, Clock3, CloudSun, ConciergeBell, UtensilsCrossed, Wifi, X } from "lucide-react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { GUEST_HOTEL_CONFIG } from "../guestHotelConfig";
import { fetchIgmanWeather } from "../igmanWeather";
import { useRoomDisplayName } from "../roomDisplay";
import "../css/RoomChoicePage.css";

const LANGUAGES = [["bs", "Bosanski"], ["en", "English"], ["de", "Deutsch"], ["tr", "Türkçe"], ["ar", "العربية"]];
const COPY = {
  bs: { welcome: "Dobro došli", room: "Soba", subtitle: "Sve što vam treba tokom boravka.", wifi: "Wi‑Fi", weather: "Vrijeme", weatherLoading: "Učitavanje vremena…", weatherUnavailable: "Vrijeme trenutno nije dostupno", hours: "Radno vrijeme", menu: "Meni", menuText: "Hrana, piće i room service", services: "Hotelske usluge", servicesText: "Wellness i dodatne usluge", call: "Pozovi osoblje", callText: "Zatražite pomoć u sobi", network: "Naziv mreže", password: "Šifra", restaurant: "Restoran", breakfast: "Doručak", wellness: "Wellness", massages: "Masaže", reception: "Recepcija", callInfo: "Napišite šta vam je potrebno. Osoblje će dobiti poruku s brojem vaše sobe.", placeholder: "Npr. Molim dodatne peškire.", send: "Pošalji zahtjev", cancel: "Odustani", sending: "Slanje…", required: "Napišite poruku od najmanje 3 znaka.", cooldown: "Osoblje možete pozvati jednom svake tri minute.", called: "Osoblje je obaviješteno.", callError: "Zahtjev trenutno nije moguće poslati." },
  en: { welcome: "Welcome", room: "Room", subtitle: "Everything you need during your stay.", wifi: "Wi‑Fi", weather: "Weather", weatherLoading: "Loading weather…", weatherUnavailable: "Weather is currently unavailable", hours: "Opening hours", menu: "Menu", menuText: "Food, drinks and room service", services: "Hotel services", servicesText: "Wellness and additional services", call: "Call staff", callText: "Request assistance in your room", network: "Network ID", password: "Password", restaurant: "Restaurant", breakfast: "Breakfast", wellness: "Wellness", massages: "Massages", reception: "Reception", callInfo: "Tell us what you need. Staff will receive the message with your room number.", placeholder: "For example, please bring extra towels.", send: "Send request", cancel: "Cancel", sending: "Sending…", required: "Enter a message with at least 3 characters.", cooldown: "You can call staff once every three minutes.", called: "Staff has been notified.", callError: "The request could not be sent." },
  de: { welcome: "Willkommen", room: "Zimmer", subtitle: "Alles, was Sie während Ihres Aufenthalts benötigen.", wifi: "WLAN", weather: "Wetter", weatherLoading: "Wetter wird geladen…", weatherUnavailable: "Wetter ist derzeit nicht verfügbar", hours: "Öffnungszeiten", menu: "Menü", menuText: "Speisen, Getränke und Zimmerservice", services: "Hoteldienstleistungen", servicesText: "Wellness und Zusatzleistungen", call: "Personal rufen", callText: "Hilfe im Zimmer anfordern", network: "Netzwerkname", password: "Passwort", restaurant: "Restaurant", breakfast: "Frühstück", wellness: "Wellness", massages: "Massagen", reception: "Rezeption", callInfo: "Schreiben Sie, was Sie benötigen. Das Personal erhält Ihre Zimmernummer.", placeholder: "Zum Beispiel: zusätzliche Handtücher.", send: "Anfrage senden", cancel: "Abbrechen", sending: "Wird gesendet…", required: "Geben Sie mindestens 3 Zeichen ein.", cooldown: "Sie können das Personal alle drei Minuten rufen.", called: "Das Personal wurde benachrichtigt.", callError: "Die Anfrage konnte nicht gesendet werden." },
  tr: { welcome: "Hoş geldiniz", room: "Oda", subtitle: "Konaklamanız boyunca ihtiyacınız olan her şey.", wifi: "Wi‑Fi", weather: "Hava durumu", weatherLoading: "Hava durumu yükleniyor…", weatherUnavailable: "Hava durumu şu anda kullanılamıyor", hours: "Çalışma saatleri", menu: "Menü", menuText: "Yiyecek, içecek ve oda servisi", services: "Otel hizmetleri", servicesText: "Wellness ve ek hizmetler", call: "Personeli çağır", callText: "Odanız için yardım isteyin", network: "Ağ adı", password: "Şifre", restaurant: "Restoran", breakfast: "Kahvaltı", wellness: "Wellness", massages: "Masaj", reception: "Resepsiyon", callInfo: "İhtiyacınızı yazın. Personel oda numaranızla birlikte mesajı alacaktır.", placeholder: "Örn. Ekstra havlu lütfen.", send: "Talep gönder", cancel: "Vazgeç", sending: "Gönderiliyor…", required: "En az 3 karakter yazın.", cooldown: "Personeli üç dakikada bir çağırabilirsiniz.", called: "Personele haber verildi.", callError: "Talep gönderilemedi." },
  ar: { welcome: "مرحبًا", room: "غرفة", subtitle: "كل ما تحتاجه أثناء إقامتك.", wifi: "واي فاي", weather: "الطقس", weatherLoading: "جارٍ تحميل الطقس…", weatherUnavailable: "الطقس غير متاح حاليًا", hours: "ساعات العمل", menu: "القائمة", menuText: "الطعام والمشروبات وخدمة الغرف", services: "خدمات الفندق", servicesText: "العافية والخدمات الإضافية", call: "استدعاء الموظفين", callText: "اطلب المساعدة في غرفتك", network: "اسم الشبكة", password: "كلمة المرور", restaurant: "المطعم", breakfast: "الإفطار", wellness: "العافية", massages: "المساج", reception: "الاستقبال", callInfo: "اكتب ما تحتاجه. سيتلقى الموظفون الرسالة مع رقم غرفتك.", placeholder: "مثال: مناشف إضافية من فضلك.", send: "إرسال الطلب", cancel: "إلغاء", sending: "جارٍ الإرسال…", required: "اكتب رسالة من 3 أحرف على الأقل.", cooldown: "يمكنك استدعاء الموظفين مرة كل ثلاث دقائق.", called: "تم إبلاغ الموظفين.", callError: "تعذر إرسال الطلب." },
};

function Dialog({ title, onClose, children }) {
  const closeRef = useRef(null);
  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (event) => event.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);
  return <div className="choiceModalOverlay" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <section className="choiceModal" role="dialog" aria-modal="true" aria-labelledby="guest-dialog-title">
      <button ref={closeRef} className="choiceModalClose" type="button" onClick={onClose} aria-label={title}><X size={20} /></button>
      <h2 id="guest-dialog-title">{title}</h2>{children}
    </section>
  </div>;
}

export default function RoomLanguagePage() {
  const navigate = useNavigate();
  const { tableId } = useParams();
  const roomDisplayName = useRoomDisplayName();
  const [searchParams, setSearchParams] = useSearchParams();
  const urlLang = searchParams.get("lang");
  const savedLang = localStorage.getItem("guest-language");
  const [lang, setLang] = useState(COPY[urlLang] ? urlLang : (COPY[savedLang] ? savedLang : "bs"));
  const [modal, setModal] = useState(null);
  const [weather, setWeather] = useState({ status: "loading" });
  const [message, setMessage] = useState("");
  const [callError, setCallError] = useState("");
  const [calling, setCalling] = useState(false);
  const [notice, setNotice] = useState("");
  const t = COPY[lang];
  const api = import.meta.env.VITE_API_URL || "";

  useEffect(() => {
    localStorage.setItem("guest-language", lang);
    const params = new URLSearchParams(searchParams);
    params.set("lang", lang);
    params.delete("view");
    setSearchParams(params, { replace: true });
    // searchParams is intentionally omitted: language changes are the only trigger.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang, setSearchParams]);

  useEffect(() => {
    const controller = new AbortController();
    fetchIgmanWeather(controller.signal).then((data) => setWeather({ status: "ready", ...data })).catch((error) => {
      if (error.name !== "AbortError") setWeather({ status: "error" });
    });
    return () => controller.abort();
  }, []);

  const callStaff = async (event) => {
    event.preventDefault();
    if (message.trim().length < 3) return setCallError(t.required);
    setCalling(true); setCallError("");
    try {
      const response = await fetch(`${api}/calls`, { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ type: "waiter", message: message.trim() }) });
      if (!response.ok) { const body = await response.json().catch(() => null); throw new Error(body?.code); }
      setMessage(""); setModal(null); setNotice(t.called);
    } catch (error) { setCallError(error.message === "STAFF_CALL_COOLDOWN" ? t.cooldown : t.callError); }
    finally { setCalling(false); }
  };

  const roomLabel = roomDisplayName || `${t.room} ${tableId}`;
  return <main className="choicePage" dir={lang === "ar" ? "rtl" : "ltr"}>
    <div className="choiceBgGlow choiceBgGlow1" /><div className="choiceBgGlow choiceBgGlow2" />
    <section className="choiceCard choiceCard--home">
      <header className="choiceTopRow">
        <div><p className="choiceEyebrow">{t.welcome}</p><h1 className="choiceTitle">{roomLabel}</h1><p className="choiceSubtitle">{t.subtitle}</p></div>
        <label className="choiceLangWrap"><span className="srOnly">Language</span><select className="choiceLangSelect" value={lang} onChange={(event) => setLang(event.target.value)}>{LANGUAGES.map(([code, label]) => <option key={code} value={code}>{label}</option>)}</select></label>
      </header>
      <div className="choiceHomeGrid">
        <button className="choiceOption choiceInfoCard" type="button" onClick={() => setModal("wifi")}><Wifi /><span><strong>{t.wifi}</strong><small>{GUEST_HOTEL_CONFIG.wifi.networkId}</small></span></button>
        <article className="choiceOption choiceInfoCard" aria-live="polite"><CloudSun /><span><strong>{weather.status === "ready" ? `Igman, ${weather.temperature}°C` : t.weather}</strong><small>{weather.status === "loading" ? t.weatherLoading : weather.status === "error" ? t.weatherUnavailable : "Igman"}</small></span></article>
        <button className="choiceOption choiceInfoCard" type="button" onClick={() => setModal("hours")}><Clock3 /><span><strong>{t.hours}</strong><small>Monti Hotel & Wellness</small></span></button>
        <button className="choiceOption choiceActionCard" type="button" onClick={() => navigate(`/t/${tableId}/menu?lang=${lang}`)}><UtensilsCrossed /><span><strong>{t.menu}</strong><small>{t.menuText}</small></span></button>
        <button className="choiceOption choiceActionCard" type="button" onClick={() => navigate(`/t/${tableId}/services?lang=${lang}`)}><BriefcaseBusiness /><span><strong>{t.services}</strong><small>{t.servicesText}</small></span></button>
        <button className="choiceOption choiceActionCard" type="button" onClick={() => { setCallError(""); setModal("call"); }}><ConciergeBell /><span><strong>{t.call}</strong><small>{t.callText}</small></span></button>
      </div>
      {notice && <div className="choiceNotice choiceNotice--success" role="status">{notice}</div>}
      <div className="guestPoweredBy">Digital ordering powered by <a href="https://tap2order.ba" target="_blank" rel="noreferrer">Tap2Order</a></div>
    </section>
    {modal === "wifi" && <Dialog title={t.wifi} onClose={() => setModal(null)}><dl className="choiceDetails"><div><dt>{t.network}</dt><dd>{GUEST_HOTEL_CONFIG.wifi.networkId}</dd></div><div><dt>{t.password}</dt><dd>{GUEST_HOTEL_CONFIG.wifi.password}</dd></div></dl></Dialog>}
    {modal === "hours" && <Dialog title={t.hours} onClose={() => setModal(null)}><dl className="choiceDetails">{GUEST_HOTEL_CONFIG.openingHours.map((item) => <div key={item.id}><dt>{t[item.id]}</dt><dd>{item.hours}</dd></div>)}</dl></Dialog>}
    {modal === "call" && <Dialog title={t.call} onClose={() => !calling && setModal(null)}><p>{t.callInfo}</p><form onSubmit={callStaff}><label className="choiceModalField"><span className="srOnly">{t.call}</span><textarea autoFocus maxLength="500" value={message} placeholder={t.placeholder} onChange={(event) => { setMessage(event.target.value); setCallError(""); }} /></label>{callError && <div className="choiceNotice choiceNotice--error" role="alert">{callError}</div>}<div className="choiceModalActions"><button className="choiceModalCancel" type="button" onClick={() => setModal(null)}>{t.cancel}</button><button className="choiceModalSend" disabled={calling}>{calling ? t.sending : t.send}</button></div></form></Dialog>}
  </main>;
}
