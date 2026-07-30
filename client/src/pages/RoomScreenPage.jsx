import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { fetchIgmanWeather } from "../igmanWeather";
import "../css/RoomScreenPage.css";

export default function RoomScreenPage() {
  const { tableId } = useParams();

  const [clock, setClock] = useState("12:00");
  const [date, setDate] = useState("Loading date...");
  const [temperature, setTemperature] = useState("Igman · --°C");

  const bgRef = useRef(null);

  // Ako koristiš već gotovu QR sliku u public folderu:
  // npr public/qr-monti-room-204.png
  // onda možeš privremeno koristiti ovo:
  const qrImage = tableId
  ? `/images/table-${tableId}-Table_${tableId}.png`
  : "/qr-placeholder.png";

  useEffect(() => {
    const updateSarajevoClock = () => {
      const now = new Date();

      const timeFormatter = new Intl.DateTimeFormat("en-GB", {
        timeZone: "Europe/Sarajevo",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });

      const dateFormatter = new Intl.DateTimeFormat("en-GB", {
        timeZone: "Europe/Sarajevo",
        weekday: "long",
        day: "2-digit",
        month: "long",
      });

      setClock(timeFormatter.format(now));
      setDate(dateFormatter.format(now));
    };

    updateSarajevoClock();
    const interval = setInterval(updateSarajevoClock, 1000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let frameId;

    const motion = {
      duration: 32000,
      maxX: 34,
      maxY: 10,
      minScale: 1.06,
      maxScale: 1.1,
    };

    const animateBackground = (timestamp) => {
      const bg = bgRef.current;
      if (!bg) {
        frameId = requestAnimationFrame(animateBackground);
        return;
      }

      const progress = (timestamp % motion.duration) / motion.duration;
      const angle = progress * Math.PI * 2;

      const x = Math.sin(angle) * motion.maxX;
      const y = Math.cos(angle * 0.7) * motion.maxY;

      const zoomWave = (Math.sin(angle - Math.PI / 2) + 1) / 2;
      const scale =
        motion.minScale + (motion.maxScale - motion.minScale) * zoomWave;

      bg.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${scale})`;

      frameId = requestAnimationFrame(animateBackground);
    };

    frameId = requestAnimationFrame(animateBackground);

    return () => cancelAnimationFrame(frameId);
  }, []);

  useEffect(() => {
    const updateIgmanTemperature = async () => {
      try {
        const data = await fetchIgmanWeather();
        setTemperature(`Igman · ${data.temperature}°C`);
      } catch {
        setTemperature("Igman · --°C");
      }
    };

    updateIgmanTemperature();
    const interval = setInterval(updateIgmanTemperature, 600000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="monti-screen">
      <div ref={bgRef} className="bg-media" />
      <div className="overlay" />

      <div className="container">
        <div className="top">
          <div className="brand-side">
            <div className="logo">
              <img
                src="https://monti.ba/en/img/logow.svg"
                alt="Hotel Monti logo"
              />
            </div>

            <div className="hotel-info">
              <div className="hotel-info-top">
                <div className="hotel-clock-wrap">
                  <div className="hotel-clock">{clock}</div>
                  <div className="hotel-date">{date}</div>
                </div>

                <div className="hotel-temp">{temperature}</div>
              </div>

              <div className="hotel-info-divider" />
              <div className="hotel-subrow">Mountain resort status</div>
            </div>
          </div>

          <div className="top-right">
            <div className="chip">Room {tableId || "204"}</div>
          </div>
        </div>

        <div className="main">
          <div className="left">
            <div className="eyebrow">Monti Hotel & Wellness</div>
            <h1>Welcome to Monti</h1>
            <div className="lead">
              Room service, concierge and guest services — elegantly accessible
              with one scan.
            </div>

            <div className="service-pills">
              <div className="service-pill">Room Service</div>
              <div className="service-pill">Concierge</div>
              <div className="service-pill">Wellness</div>
            </div>
          </div>

          <div className="panel">
            <div className="panel-label">Guest Services</div>

            <div className="qr-wrap">
              <div className="scan-hint">Scan with your phone</div>

              {/* Privremeno koristi fallbackQrImage.
                  Kasnije ovo zamijeniš pravim QR generatorom za guestUrl */}
              <img
  src={qrImage}
  alt={`QR code for room ${tableId}`}
/>
            </div>

            <h2>Scan to access services</h2>
            <p>
              Access room service, hotel assistance and useful information in
              seconds.
            </p>

            <div className="meta">
              <div className="meta-row">
                <span>Reception</span>
                <strong>9</strong>
              </div>
              <div className="meta-row">
                <span>Breakfast</span>
                <strong>07:00 – 10:00</strong>
              </div>
              <div className="meta-row">
                <span>Wi-Fi</span>
                <strong>Monti Guest</strong>
              </div>
              <div className="meta-row">
                <span>Spa & Wellness</span>
                <strong>Level -1</strong>
              </div>
            </div>
          </div>
        </div>

        <div className="footer">
          <div>Monti Digital Concierge</div>
          <div className="footer-right">Tap2Order.ba TV Display</div>
        </div>
      </div>
    </div>
  );
}
