import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import "../css/HotelServicesPage.css";

export default function HotelServicesPage() {
  const navigate = useNavigate();
  const { tableId } = useParams();
  const [searchParams] = useSearchParams();
  const [infoModalOpen, setInfoModalOpen] = useState(false);

  const urlToken = searchParams.get("token") || "";
  const lang = searchParams.get("lang") || "bs";

  const tokenStorageKey = `room-token-${tableId}`;

  if (urlToken) {
    sessionStorage.setItem(tokenStorageKey, urlToken);
  }

  const token = urlToken || sessionStorage.getItem(tokenStorageKey) || "";

  useEffect(() => {
    if (urlToken) {
      window.history.replaceState(
        {},
        "",
        `/t/${tableId}/services?lang=${lang}`
      );
    }
  }, [urlToken, tableId, lang]);

  const isRtl = lang === "ar";

  const text = {
    bs: {
      eyebrow: "HOTELSKE USLUGE",
      room: "Soba",
      subtitle: "Pregledajte dostupne hotelske usluge.",
      backToMenu: "Nazad",
      title: "Hotelske usluge",
      total: "ukupno",
      items: "artikala",
      bottomNote: "Odaberite uslugu za više informacija.",
      massage: "Masaža",
      quad: "Quad",
      receptionTitle: "Više informacija",
      receptionInfo: "Obratite se recepciji za više informacija.",
      close: "Zatvori",
    },
    en: {
      eyebrow: "HOTEL SERVICES",
      room: "Room",
      subtitle: "Browse available hotel services.",
      backToMenu: "Back",
      title: "Hotel services",
      total: "total",
      items: "items",
      bottomNote: "Choose a service for more information.",
      massage: "Massage",
      quad: "Quad",
      receptionTitle: "More information",
      receptionInfo: "Please contact reception for more information.",
      close: "Close",
    },
    de: {
      eyebrow: "HOTELDIENSTLEISTUNGEN",
      room: "Zimmer",
      subtitle: "Sehen Sie sich die verfügbaren Hoteldienstleistungen an.",
      backToMenu: "Zurück",
      title: "Hoteldienstleistungen",
      total: "insgesamt",
      items: "Artikel",
      bottomNote: "Wählen Sie eine Dienstleistung für weitere Informationen.",
      massage: "Massage",
      quad: "Quad",
      receptionTitle: "Weitere Informationen",
      receptionInfo:
        "Bitte wenden Sie sich für weitere Informationen an die Rezeption.",
      close: "Schließen",
    },
    ar: {
      eyebrow: "خدمات الفندق",
      room: "غرفة",
      subtitle: "تصفح خدمات الفندق المتاحة.",
      backToMenu: "رجوع",
      title: "خدمات الفندق",
      total: "المجموع",
      items: "عناصر",
      bottomNote: "اختر خدمة للحصول على مزيد من المعلومات.",
      massage: "مساج",
      quad: "كواد",
      receptionTitle: "مزيد من المعلومات",
      receptionInfo: "يرجى التواصل مع الاستقبال للحصول على مزيد من المعلومات.",
      close: "إغلاق",
    },
    tr: {
      eyebrow: "OTEL HİZMETLERİ",
      room: "Oda",
      subtitle: "Mevcut otel hizmetlerini inceleyin.",
      backToMenu: "Geri",
      title: "Otel hizmetleri",
      total: "toplam",
      items: "ürün",
      bottomNote: "Daha fazla bilgi için bir hizmet seçin.",
      massage: "Masaj",
      quad: "Quad",
      receptionTitle: "Daha fazla bilgi",
      receptionInfo: "Daha fazla bilgi için lütfen resepsiyonla iletişime geçin.",
      close: "Kapat",
    },
  };

  const t = text[lang] || text.bs;

  const serviceCategories = [
    { id: "massage", name: t.massage, count: 0 },
    { id: "quad", name: t.quad, count: 0 },
  ];

  const handleCategoryClick = () => {
    setInfoModalOpen(true);
  };

  return (
    <div className="hotelServicesPage" dir={isRtl ? "rtl" : "ltr"}>
      <div className="hotelServicesContainer">
        <button
          className="guestBackBtn"
          type="button"
          onClick={() => navigate(`/t/${tableId}?lang=${lang}`)}
        >
          ← {t.backToMenu}
        </button>

        <section className="hotelServicesHero">
          <div className="hotelServicesHeroLeft">
            <p className="hotelServicesEyebrow">{t.eyebrow}</p>
            <h1 className="hotelServicesRoomTitle">
              {t.room} {tableId}
            </h1>
            <p className="hotelServicesSubtitle">{t.subtitle}</p>
          </div>
        </section>

        <section className="hotelServicesMenuCard">
          <div className="hotelServicesMenuHeader">
            <h2 className="hotelServicesMenuTitle">{t.title}</h2>
            <div className="hotelServicesBadge">
              {serviceCategories.length} {t.total}
            </div>
          </div>

          <div className="hotelServicesGrid">
            {serviceCategories.map((category) => (
              <button
                key={category.id}
                type="button"
                className="hotelServicesCategoryCard"
                onClick={handleCategoryClick}
              >
                <span className="hotelServicesCategoryName">
                  {category.name}
                </span>
                {/*  <span className="hotelServicesCategoryCount">
                  {category.count} {t.items}
                </span> */}
              </button>
            ))}
          </div>
        </section>

        <p className="hotelServicesBottomNote">{t.bottomNote}</p>

        <div className="guestPoweredBy">
          Digital ordering powered by{" "}
          <a href="https://tap2order.ba" target="_blank" rel="noreferrer">
            Tap2Order
          </a>
        </div>
      </div>

      {infoModalOpen && (
        <div
          className="hotelServicesModalOverlay"
          onClick={() => setInfoModalOpen(false)}
        >
          <div
            className="hotelServicesModal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="hotelServicesModalIcon">i</div>

            <h3 className="hotelServicesModalTitle">{t.receptionTitle}</h3>

            <p className="hotelServicesModalText">{t.receptionInfo}</p>

            <button
              type="button"
              className="hotelServicesModalBtn"
              onClick={() => setInfoModalOpen(false)}
            >
              {t.close}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}