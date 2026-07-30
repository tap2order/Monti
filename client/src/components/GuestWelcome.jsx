import { createElement } from "react";
import {
  BriefcaseBusiness,
  ChevronRight,
  CloudSun,
  ConciergeBell,
  Copy,
  MapPin,
  Sparkles,
  UtensilsCrossed,
  Wifi,
} from "lucide-react";
import { GUEST_HOTEL_CONFIG } from "../guestHotelConfig";
import { GUEST_WELCOME_LANGUAGES } from "../guestWelcomeContent";

export function WelcomeHero({ lang, onLanguageChange, t, roomDisplayName, tableId }) {
  const roomName = roomDisplayName || tableId;

  return (
    <header className="welcomeHero">
      <img className="welcomeHeroImage" src="https://www.monti.ba/img/landingproljece.webp" alt="Monti Hotel & Wellness" />
      <div className="welcomeHeroOverlay" />
      <label className="welcomeLanguageSwitcher">
        <span className="srOnly">{t.language}</span>
        <select value={lang} onChange={(event) => onLanguageChange(event.target.value)} aria-label={t.language}>
          {GUEST_WELCOME_LANGUAGES.map(([code, name]) => <option key={code} value={code}>{code.toUpperCase()} — {name}</option>)}
        </select>
      </label>
      <div className="welcomeHeroContent">
        <p className="welcomeHeroBrand">Monti Hotel &amp; Wellness</p>
        <h1>{t.welcome}</h1>
        <p className="welcomeHeroRoom">{t.room} {roomName}</p>
      </div>
    </header>
  );
}

function QuickInfoItem({ icon: Icon, label, children }) {
  return (
    <article className="quickInfoItem">
      {createElement(Icon, { className: "quickInfoIcon", "aria-hidden": true, size: 20 })}
      <div className="quickInfoBody"><p className="quickInfoLabel">{label}</p>{children}</div>
    </article>
  );
}

export function QuickInfoPanel({ t, weather, onCopyPassword }) {
  const breakfast = GUEST_HOTEL_CONFIG.openingHours.find((item) => item.id === "breakfast")?.hours;
  const wellness = GUEST_HOTEL_CONFIG.openingHours.find((item) => item.id === "wellness")?.hours;
  const weatherText = weather.status === "ready" ? t.weatherConditions[weather.code] || t.weatherConditions.default : null;

  return (
    <section className="quickInfoPanel" aria-label={t.quickInfo}>
      <QuickInfoItem icon={Wifi} label={t.wifi}>
        <p className="quickInfoValue">{GUEST_HOTEL_CONFIG.wifi.networkId}</p>
        {GUEST_HOTEL_CONFIG.wifi.passwordAvailable && <button className="copyPasswordButton" type="button" onClick={onCopyPassword}><Copy size={14} aria-hidden="true" /> {t.copyPassword}</button>}
      </QuickInfoItem>
      <QuickInfoItem icon={CloudSun} label={t.weather}>
        {weather.status === "loading" && <span className="weatherSkeleton" aria-label={t.weatherLoading} />}
        {weather.status === "error" && <p className="quickInfoMuted">{t.weatherUnavailable}</p>}
        {weather.status === "ready" && <><p className="quickInfoValue">{weather.temperature}°C</p><p className="quickInfoMuted">{weatherText}</p></>}
      </QuickInfoItem>
      <QuickInfoItem icon={UtensilsCrossed} label={t.breakfast}><p className="quickInfoValue">{breakfast}</p></QuickInfoItem>
      <QuickInfoItem icon={Sparkles} label={t.wellness}><p className="quickInfoValue">{wellness}</p></QuickInfoItem>
    </section>
  );
}

export function PrimaryMenuCard({ t, onClick }) {
  return <button className="primaryMenuCard" type="button" onClick={onClick}>
    <span className="primaryMenuIcon"><UtensilsCrossed aria-hidden="true" size={24} /></span>
    <span className="primaryMenuCopy"><strong>{t.menuOrder}</strong><small>{t.menuText}</small><em>{t.viewMenu}</em></span>
    <ChevronRight className="actionChevron" aria-hidden="true" size={24} />
  </button>;
}

function ServiceCard({ icon: Icon, title, description, onClick }) {
  return <button className="serviceCard" type="button" onClick={onClick}>
    {createElement(Icon, { className: "serviceIcon", "aria-hidden": true, size: 21 })}
    <span><strong>{title}</strong><small>{description}</small></span>
    <ChevronRight className="serviceChevron" aria-hidden="true" size={18} />
  </button>;
}

export function ServiceGrid({ t, onOpenServices, onOpenCall, onOpenLocation }) {
  return <section className="welcomeSection" aria-labelledby="hotel-services-title">
    <h2 id="hotel-services-title">{t.hotelServices}</h2>
    <div className="serviceGrid">
      <ServiceCard icon={Sparkles} title={t.wellness} description={t.wellnessText} onClick={onOpenServices} />
      <ServiceCard icon={BriefcaseBusiness} title={t.hotelInformation} description={t.hotelInformationText} onClick={onOpenServices} />
      <ServiceCard icon={ConciergeBell} title={t.call} description={t.callText} onClick={onOpenCall} />
      <ServiceCard icon={MapPin} title={t.location} description={t.locationText} onClick={onOpenLocation} />
    </div>
  </section>;
}

export function PoweredByFooter({ t }) {
  return <footer className="welcomePoweredBy">{t.poweredBy} <a href="https://tap2order.ba" target="_blank" rel="noreferrer">Tap2Order</a></footer>;
}
