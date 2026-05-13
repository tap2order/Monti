import { useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import "../css/RoomChoicePage.css";

export default function RoomLanguagePage() {
  const navigate = useNavigate();
  const { tableId } = useParams();
  const [searchParams] = useSearchParams();

  const token = searchParams.get("token") || "";
  const initialLang = searchParams.get("lang") || "bs";
  const [selectedLang, setSelectedLang] = useState(initialLang);
  const [languageConfirmed, setLanguageConfirmed] = useState(false);

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
      back: "Zurück",
    },
  };

  const t = text[selectedLang] || text.bs;

  const goBack = () => {
    navigate(-1);
  };

  const goToMenu = () => {
    navigate(`/t/${tableId}/menu?token=${token}&lang=${selectedLang}`);
  };

  const goToServices = () => {
    navigate(`/t/${tableId}/services?token=${token}&lang=${selectedLang}`);
  };

  if (!languageConfirmed) {
    return (
      <div className="choicePage">
        <div className="choiceBgGlow choiceBgGlow1"></div>
        <div className="choiceBgGlow choiceBgGlow2"></div>

        <div className="choiceCard">
          

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
              onClick={() => {
                setSelectedLang("bs");
                setLanguageConfirmed(true);
              }}
            >
              <span className="choiceOptionLabel">Bosanski</span>
              <span className="choiceOptionText">
                Nastavite na bosanskom jeziku.
              </span>
            </button>

            <button
              type="button"
              className="choiceOption"
              onClick={() => {
                setSelectedLang("en");
                setLanguageConfirmed(true);
              }}
            >
              <span className="choiceOptionLabel">English</span>
              <span className="choiceOptionText">Continue in English.</span>
            </button>

            <button
              type="button"
              className="choiceOption"
              onClick={() => {
                setSelectedLang("de");
                setLanguageConfirmed(true);
              }}
            >
              <span className="choiceOptionLabel">Deutsch</span>
              <span className="choiceOptionText">Weiter auf Deutsch.</span>
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

      <div className="choiceCard">
        <button
          className="guestBackBtn"
          type="button"
          onClick={() => setLanguageConfirmed(false)}
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
        </div>

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