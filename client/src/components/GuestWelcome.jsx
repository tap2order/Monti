import { createElement, useEffect, useRef, useState } from "react";
import {
  BriefcaseBusiness,
  ChevronDown,
  ChevronRight,
  CloudSun,
  ConciergeBell,
  Copy,
  Sparkles,
  UtensilsCrossed,
  Wifi,
} from "lucide-react";
import { GUEST_HOTEL_CONFIG } from "../guestHotelConfig";
import { GUEST_WELCOME_LANGUAGES } from "../guestWelcomeContent";

function LanguageDropdown({ lang, onChange, label }) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);
  const triggerRef = useRef(null);
  const languageRefs = useRef([]);
  const activeLanguageIndex = GUEST_WELCOME_LANGUAGES.findIndex(([code]) => code === lang);

  const focusLanguage = (index) => {
    const nextIndex = (index + GUEST_WELCOME_LANGUAGES.length) % GUEST_WELCOME_LANGUAGES.length;
    languageRefs.current[nextIndex]?.focus();
  };

  const openWithKeyboard = (offset) => {
    setOpen(true);
    requestAnimationFrame(() => focusLanguage(activeLanguageIndex + offset));
  };

  useEffect(() => {
    const closeOnOutsideClick = (event) => {
      if (!dropdownRef.current?.contains(event.target)) setOpen(false);
    };
    const closeOnEscape = (event) => {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  return (
    <div className="welcomeLanguageDropdown" ref={dropdownRef}>
      <button
        ref={triggerRef}
        type="button"
        className="welcomeLanguageTrigger"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            openWithKeyboard(event.key === "ArrowDown" ? 1 : -1);
          }
        }}
      >
        {lang.toUpperCase()} <ChevronDown aria-hidden="true" size={15} />
      </button>
      {open && (
        <div className="welcomeLanguageMenu" role="menu" aria-label={label}>
          {GUEST_WELCOME_LANGUAGES.map(([code, name]) => (
            <button
              key={code}
              type="button"
              role="menuitem"
              ref={(element) => { languageRefs.current[GUEST_WELCOME_LANGUAGES.findIndex(([languageCode]) => languageCode === code)] = element; }}
              className={code === lang ? "is-active" : ""}
              onClick={() => { onChange(code); setOpen(false); }}
              onKeyDown={(event) => {
                const index = GUEST_WELCOME_LANGUAGES.findIndex(([languageCode]) => languageCode === code);
                if (event.key === "ArrowDown") { event.preventDefault(); focusLanguage(index + 1); }
                if (event.key === "ArrowUp") { event.preventDefault(); focusLanguage(index - 1); }
                if (event.key === "Home") { event.preventDefault(); focusLanguage(0); }
                if (event.key === "End") { event.preventDefault(); focusLanguage(GUEST_WELCOME_LANGUAGES.length - 1); }
              }}
            >
              <span>{code.toUpperCase()}</span>{name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function WelcomeHero({ lang, onLanguageChange, t, roomDisplayName, tableId }) {
  const roomName = roomDisplayName || tableId;

  return (
    <header className="welcomeHero">
      <img className="welcomeHeroImage" src="https://www.monti.ba/img/landingproljece.webp" alt="Monti Hotel & Wellness" />
      <div className="welcomeHeroOverlay" />
      <LanguageDropdown lang={lang} onChange={onLanguageChange} label={t.language} />
      <div className="welcomeHeroContent">
        <p className="welcomeHeroBrand">Monti Hotel &amp; Wellness</p>
        <h1>{t.welcome}</h1>
        <p className="welcomeHeroRoom">{t.room} {roomName}</p>
      </div>
    </header>
  );
}

function QuickInfoItem({ icon: Icon, label, children }) {
  return <article className="quickInfoItem">
    {createElement(Icon, { className: "quickInfoIcon", "aria-hidden": true, size: 20 })}
    <div className="quickInfoBody"><p className="quickInfoLabel">{label}</p>{children}</div>
  </article>;
}

export function QuickInfoPanel({ t, weather, onCopyPassword }) {
  const breakfast = GUEST_HOTEL_CONFIG.openingHours.find((item) => item.id === "breakfast")?.hours;
  const wellness = GUEST_HOTEL_CONFIG.openingHours.find((item) => item.id === "wellness")?.hours;
  const weatherText = weather.status === "ready" ? t.weatherConditions[weather.code] || t.weatherConditions.default : null;

  return <section className="quickInfoPanel" aria-label={t.quickInfo}>
    <QuickInfoItem icon={Wifi} label={t.wifi}>
      <p className="quickInfoValue">{GUEST_HOTEL_CONFIG.wifi.networkId}</p>
      <button className="copyPasswordButton" type="button" onClick={onCopyPassword}><Copy size={14} aria-hidden="true" /> {t.copyPassword}</button>
    </QuickInfoItem>
    <QuickInfoItem icon={CloudSun} label={t.weather}>
      {weather.status === "loading" && <span className="weatherSkeleton" aria-label={t.weatherLoading} />}
      {weather.status === "error" && <p className="quickInfoMuted">{t.weatherUnavailable}</p>}
      {weather.status === "ready" && <><p className="quickInfoValue">{weather.temperature}°C</p><p className="quickInfoMuted">{weatherText}</p></>}
    </QuickInfoItem>
    <QuickInfoItem icon={UtensilsCrossed} label={t.breakfast}><p className="quickInfoValue">{breakfast}</p></QuickInfoItem>
    <QuickInfoItem icon={Sparkles} label={t.wellness}><p className="quickInfoValue">{wellness}</p></QuickInfoItem>
  </section>;
}

function ActionCard({ icon: Icon, title, description, detail, cta, onClick }) {
  return <button className="welcomeActionCard" type="button" onClick={onClick}>
    <span className="welcomeActionIcon">{createElement(Icon, { "aria-hidden": true, size: 24 })}</span>
    <span className="welcomeActionCopy">
      <strong>{title}</strong>
      <small>{description}</small>
      <em>{detail}</em>
      <b>{cta}</b>
    </span>
    <ChevronRight className="actionChevron" aria-hidden="true" size={24} />
  </button>;
}

export function PrimaryMenuCard({ t, onClick }) {
  return <ActionCard
    icon={UtensilsCrossed}
    title={t.menuOrder}
    description={t.menuText}
    detail={`${t.roomService} ${GUEST_HOTEL_CONFIG.openingHours.find((item) => item.id === "roomService")?.hours}`}
    cta={t.viewMenu}
    onClick={onClick}
  />;
}

export function ServiceActionCards({ t, onOpenServices, onOpenCall }) {
  const wellness = GUEST_HOTEL_CONFIG.openingHours.find((item) => item.id === "wellness")?.hours;
  const reception = GUEST_HOTEL_CONFIG.openingHours.find((item) => item.id === "reception")?.hours;

  return <section className="welcomeSection" aria-labelledby="hotel-services-title">
    <h2 id="hotel-services-title">{t.hotelServices}</h2>
    <div className="welcomeActionList">
      <ActionCard icon={BriefcaseBusiness} title={t.hotelServices} description={t.servicesText} detail={`${t.wellness} ${wellness}`} cta={t.viewServices} onClick={onOpenServices} />
      <ActionCard icon={ConciergeBell} title={t.call} description={t.callText} detail={`${t.reception} ${reception}`} cta={t.requestAssistance} onClick={onOpenCall} />
    </div>
  </section>;
}

export function PoweredByFooter({ t }) {
  return <footer className="welcomePoweredBy">{t.poweredBy} <a href="https://tap2order.ba" target="_blank" rel="noreferrer">Tap2Order</a></footer>;
}
