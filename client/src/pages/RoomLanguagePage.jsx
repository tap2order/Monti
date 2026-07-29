import { useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import "../css/RoomChoicePage.css";

export default function RoomLanguagePage() {
  const navigate = useNavigate();
  const { tableId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialLang = searchParams.get("lang") || "bs";

  const [selectedLang, setSelectedLang] = useState(initialLang);
  const [languageConfirmed, setLanguageConfirmed] = useState(
    () => searchParams.get("view") === "options"
  );
  const [callingStaff, setCallingStaff] = useState(false);
  const [callNotice, setCallNotice] = useState(null);
  const isRtl = selectedLang === "ar";
  const api = import.meta.env.VITE_API_URL || "";

  const text = {
    bs: {
      welcome: "DOBRODOŠLI",
      room: "Soba",
      chooseLanguage: "Odaberite jezik",
      chooseLanguageSubtitle: "Prvo odaberite jezik za nastavak.",
      continue: "Nastavi",
      chooseOption: "Odaberite željenu opciju za nastavak.",
      menu: "Meni",
      menuText: "Pregled hrane, pića i room service ponude.",
      services: "Hotelske usluge",
      servicesText: "Masaže, quad, wellness i ostale dodatne usluge.",
      callStaff: "Pozovi osoblje",
      callStaffText: "Pošaljite zahtjev osoblju ako vam je potrebna pomoć u sobi.",
      callingStaff: "Pozivanje osoblja...",
      staffCalled: "Osoblje je obaviješteno i uskoro će doći do vaše sobe.",
      callError: "Poziv trenutno nije moguće poslati. Pokušajte ponovo.",
      back: "Nazad",
    },
    en: {
      welcome: "WELCOME",
      room: "Room",
      chooseLanguage: "Choose language",
      chooseLanguageSubtitle: "First choose your language to continue.",
      continue: "Continue",
      chooseOption: "Choose an option to continue.",
      menu: "Menu",
      menuText: "Browse food, drinks and room service offer.",
      services: "Hotel services",
      servicesText: "Massages, quad, wellness and other additional services.",
      callStaff: "Call staff",
      callStaffText: "Send a request to staff if you need assistance in your room.",
      callingStaff: "Calling staff...",
      staffCalled: "Staff has been notified and will come to your room shortly.",
      callError: "The request could not be sent. Please try again.",
      back: "Back",
    },
    de: {
      welcome: "WILLKOMMEN",
      room: "Zimmer",
      chooseLanguage: "Sprache auswählen",
      chooseLanguageSubtitle: "Wählen Sie zuerst Ihre Sprache aus.",
      continue: "Weiter",
      chooseOption: "Wählen Sie eine Option zum Fortfahren.",
      menu: "Menü",
      menuText: "Speisen, Getränke und Room-Service-Angebot ansehen.",
      services: "Hoteldienstleistungen",
      servicesText: "Massagen, Quad, Wellness und weitere Zusatzleistungen.",
      callStaff: "Personal rufen",
      callStaffText: "Senden Sie eine Anfrage, wenn Sie Hilfe in Ihrem Zimmer benötigen.",
      callingStaff: "Personal wird gerufen...",
      staffCalled: "Das Personal wurde benachrichtigt und kommt in Kürze zu Ihrem Zimmer.",
      callError: "Die Anfrage konnte nicht gesendet werden. Bitte versuchen Sie es erneut.",
      back: "Zurück",
    },
    ar: {
      welcome: "مرحبًا",
      room: "غرفة",
      chooseLanguage: "اختر اللغة",
      chooseLanguageSubtitle: "يرجى اختيار اللغة أولاً للمتابعة.",
      continue: "متابعة",
      chooseOption: "اختر خيارًا للمتابعة.",
      menu: "القائمة",
      menuText: "تصفح الطعام والمشروبات وخدمة الغرف.",
      services: "خدمات الفندق",
      servicesText: "المساج، الكواد، السبا والخدمات الإضافية الأخرى.",
      callStaff: "استدعاء الموظفين",
      callStaffText: "أرسل طلبًا إلى الموظفين إذا كنت بحاجة إلى مساعدة في غرفتك.",
      callingStaff: "جارٍ استدعاء الموظفين...",
      staffCalled: "تم إبلاغ الموظفين وسيصلون إلى غرفتك قريبًا.",
      callError: "تعذر إرسال الطلب. يرجى المحاولة مرة أخرى.",
      back: "رجوع",
    },
    tr: {
      welcome: "HOŞ GELDİNİZ",
      room: "Oda",
      chooseLanguage: "Dil seçin",
      chooseLanguageSubtitle: "Devam etmek için önce dilinizi seçin.",
      continue: "Devam et",
      chooseOption: "Devam etmek için bir seçenek seçin.",
      menu: "Menü",
      menuText: "Yiyecek, içecek ve oda servisi seçeneklerini inceleyin.",
      services: "Otel hizmetleri",
      servicesText: "Masaj, quad, wellness ve diğer ek hizmetler.",
      callStaff: "Personeli çağır",
      callStaffText: "Odanızda yardıma ihtiyacınız varsa personele istek gönderin.",
      callingStaff: "Personel çağrılıyor...",
      staffCalled: "Personele haber verildi ve kısa süre içinde odanıza gelecek.",
      callError: "İstek gönderilemedi. Lütfen tekrar deneyin.",
      back: "Geri",
    },
  };

  const t = text[selectedLang] || text.bs;

  const selectLanguage = (lang) => {
    setSelectedLang(lang);
    setLanguageConfirmed(true);
    const params = new URLSearchParams(searchParams);
    params.set("lang", lang);
    params.set("view", "options");
    setSearchParams(params, { replace: true });
  };

  const goToMenu = () => {
    navigate(`/t/${tableId}/menu?lang=${selectedLang}`);
  };

  const goToServices = () => {
    navigate(`/t/${tableId}/services?lang=${selectedLang}`);
  };

  const callStaff = async () => {
    if (callingStaff) return;
    setCallingStaff(true);
    setCallNotice(null);

    try {
      const response = await fetch(`${api}/calls`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ type: "waiter" }),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      setCallNotice({ type: "success", text: t.staffCalled });
    } catch {
      setCallNotice({ type: "error", text: t.callError });
    } finally {
      setCallingStaff(false);
    }
  };

  const goBackToLanguages = () => {
    setLanguageConfirmed(false);
    const params = new URLSearchParams(searchParams);
    params.delete("view");
    setSearchParams(params, { replace: true });
  };

  if (!languageConfirmed) {
    return (
      <div className="choicePage">
        <div className="choiceBgGlow choiceBgGlow1"></div>
        <div className="choiceBgGlow choiceBgGlow2"></div>

        <div className="choiceCard" dir={isRtl ? "rtl" : "ltr"}>
          <div className="choiceTopRow">
            <div className="choiceTopText">
              <p className="choiceEyebrow">{t.welcome}</p>
              <h1 className="choiceTitle">
                {t.room} {tableId}
              </h1>
              <p className="choiceSubtitle">{t.chooseLanguageSubtitle}</p>
            </div>
          </div>

          <div className="choiceGrid">
            <button
              type="button"
              className="choiceOption"
              onClick={() => selectLanguage("bs")}
            >
              <span className="choiceOptionLabel">Bosanski</span>
              <span className="choiceOptionText">
                Nastavite na bosanskom jeziku.
              </span>
            </button>

            <button
              type="button"
              className="choiceOption"
              onClick={() => selectLanguage("en")}
            >
              <span className="choiceOptionLabel">English</span>
              <span className="choiceOptionText">Continue in English.</span>
            </button>

            <button
              type="button"
              className="choiceOption"
              onClick={() => selectLanguage("de")}
            >
              <span className="choiceOptionLabel">Deutsch</span>
              <span className="choiceOptionText">Weiter auf Deutsch.</span>
            </button>

            <button
              type="button"
              className="choiceOption"
              onClick={() => selectLanguage("tr")}
            >
              <span className="choiceOptionLabel">Türkçe</span>
              <span className="choiceOptionText">Türkçe devam edin.</span>
            </button>

            <button
              type="button"
              className="choiceOption"
              onClick={() => selectLanguage("ar")}
            >
              <span className="choiceOptionLabel">العربية</span>
              <span className="choiceOptionText">تابع باللغة العربية.</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="choicePage">
      <div className="choiceBgGlow choiceBgGlow1"></div>
      <div className="choiceBgGlow choiceBgGlow2"></div>

      <div className="choiceCard" dir={isRtl ? "rtl" : "ltr"}>
        <button
          className="guestBackBtn"
          type="button"
          onClick={goBackToLanguages}
        >
          ← {t.back}
        </button>

        <div className="choiceTopRow">
          <div className="choiceTopText">
            <p className="choiceEyebrow">{t.welcome}</p>
            <h1 className="choiceTitle">
              {t.room} {tableId}
            </h1>
            <p className="choiceSubtitle">{t.chooseOption}</p>
          </div>

          {/* <div className="choiceLangWrap">
            <select
              className="choiceLangSelect"
              value={selectedLang}
              onChange={(e) => setSelectedLang(e.target.value)}
            >
              <option value="bs">Bosnian</option>
              <option value="en">English</option>
              <option value="de">Deutsch</option>
              <option value="tr">Türkçe</option>
              <option value="ar">العربية</option>
            </select>
          </div> */}
        </div>

        <div className="choiceGrid">
          <button type="button" className="choiceOption" onClick={goToMenu}>
            <span className="choiceOptionLabel">{t.menu}</span>
            <span className="choiceOptionText">{t.menuText}</span>
          </button>

          <button type="button" className="choiceOption" onClick={goToServices}>
            <span className="choiceOptionLabel">{t.services}</span>
            <span className="choiceOptionText">{t.servicesText}</span>
          </button>

          <button
            type="button"
            className="choiceOption"
            onClick={callStaff}
            disabled={callingStaff}
          >
            <span className="choiceOptionLabel">
              {callingStaff ? t.callingStaff : t.callStaff}
            </span>
            <span className="choiceOptionText">{t.callStaffText}</span>
          </button>
        </div>

        {callNotice && (
          <div className={`choiceNotice choiceNotice--${callNotice.type}`} role="status">
            {callNotice.text}
          </div>
        )}

        <div className="guestPoweredBy">
          Digital ordering powered by{" "}
          <a href="https://tap2order.ba" target="_blank" rel="noreferrer">
            Tap2Order
          </a>
        </div>
      </div>
    </div>
  );
}
