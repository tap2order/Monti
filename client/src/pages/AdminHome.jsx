import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { isAdminLoggedIn } from "../adminAuth";
import { disableAdminPush, enableAdminPush, getPushState } from "../pushNotifications";
import "../css/AdminHome.css";

export default function AdminHome() {
  const nav = useNavigate();
  const api = import.meta.env.VITE_API_URL || "";
  const [pushState, setPushState] = useState("loading");
  const [pushMessage, setPushMessage] = useState("");

  useEffect(() => {
    if (!isAdminLoggedIn()) nav("/admin");
    getPushState().then(setPushState).catch((error) => {
      setPushState("disabled");
      setPushMessage(error.message || "Nije moguće provjeriti stanje notifikacija.");
    });
  }, [nav]);

  async function togglePush() {
    setPushState("loading");
    setPushMessage("");
    try {
      const enabled = await getPushState() === "enabled";
      if (enabled) {
        await disableAdminPush(api);
        setPushState("disabled");
        setPushMessage("Notifikacije su isključene na ovom uređaju.");
      } else {
        await enableAdminPush(api);
        setPushState("enabled");
        setPushMessage("Notifikacije su uključene na ovom uređaju.");
      }
    } catch (error) {
      setPushState(await getPushState().catch(() => "disabled"));
      setPushMessage(error.message || "Notifikacije nije moguće uključiti.");
    }
  }

  return (
    <div className="adminHomePage">
      <div className="adminHomeShell">
        <div className="adminHomeHero">
          <div className="adminHomeHeroText">
            <div className="adminHomeKicker">Tap2Order Monti</div>
            <h1 className="adminHomeTitle">Hotel Dashboard</h1>

            {/* <p className="adminHomeSubtitle">
              Upravljaj sobama, osobljem, zahtjevima gostiju i room service-om
              iz jednog preglednog admin centra.
            </p> */}
          </div>
          <div className="adminHomeNotification">
            <button
              type="button"
              className={`adminHomeNotificationBtn${pushState === "enabled" ? " is-enabled" : ""}`}
              onClick={togglePush}
              disabled={pushState === "loading" || pushState === "unsupported" || pushState === "insecure" || pushState === "denied"}
            >
              {pushState === "enabled" ? "Isključi notifikacije" : pushState === "loading" ? "Provjera…" : "Uključi notifikacije"}
            </button>
            {pushState === "unsupported" && <span>Browser ne podržava push notifikacije.</span>}
            {pushState === "insecure" && <span>Push notifikacije zahtijevaju HTTPS adresu.</span>}
            {pushState === "denied" && <span>Notifikacije su blokirane u postavkama browsera.</span>}
            {pushMessage && <span>{pushMessage}</span>}
          </div>
        </div>

        <div className="adminHomeGrid">
          {/* <Link to="/admin/tables" className="adminHomeCard is-featured">
            <div className="adminHomeCardTop">
              <div className="adminHomeIconWrap">
                <span className="adminHomeIcon" aria-hidden="true">
                  🛏️
                </span>
              </div>

              <div className="adminHomeCardHeading">
                <div className="adminHomeCardEyebrow">Rooms</div>
                <div className="adminHomeCardTitle">Pogledaj sobe</div>
              </div>
            </div>

            <div className="adminHomeCardDesc">
              Pregledajte sobe i brzo otvorite stranice soba za goste.
            </div>

            <div className="adminHomeCardFooter">
              <span className="adminHomeCardArrow" aria-hidden="true">
                →
              </span>
            </div>
          </Link> */}

          <Link to="/admin/waiter" className="adminHomeCard is-featured">
            <div className="adminHomeCardTop">
              <div className="adminHomeIconWrap">
                <span className="adminHomeIcon" aria-hidden="true">
                  👥
                </span>
              </div>

              <div className="adminHomeCardHeading">
                <div className="adminHomeCardEyebrow">Osoblje</div>
                <div className="adminHomeCardTitle">Dashboard za osoblje</div>
              </div>
            </div>

            <div className="adminHomeCardDesc">
              Pratite pozive gostiju te nove i preuzete Room Service narudžbe.
            </div>

            <div className="adminHomeCardFooter">
              <span className="adminHomeCardArrow" aria-hidden="true">
                →
              </span>
            </div>
          </Link>

          <Link to="/admin/menu" className="adminHomeCard">
            <div className="adminHomeCardTop">
              <div className="adminHomeIconWrap">
                <span className="adminHomeIcon" aria-hidden="true">
                  🍽️
                </span>
              </div>

              <div className="adminHomeCardHeading">
                <div className="adminHomeCardEyebrow">Room Service</div>
                <div className="adminHomeCardTitle">Room Service Menu</div>
              </div>
            </div>

            <div className="adminHomeCardDesc">
              Uredite kategorije, stavke menija i dostupnost.
            </div>

            <div className="adminHomeCardFooter">
              <span className="adminHomeCardArrow" aria-hidden="true">
                →
              </span>
            </div>
          </Link>

          <Link to="/admin/orders-overview" className="adminHomeCard">
            <div className="adminHomeCardTop">
              <div className="adminHomeIconWrap">
                <span className="adminHomeIcon" aria-hidden="true">
                  📋
                </span>
              </div>

              <div className="adminHomeCardHeading">
                <div className="adminHomeCardEyebrow">Admin Overview</div>
                <div className="adminHomeCardTitle">Historija narudžbi</div>
              </div>
            </div>

            <div className="adminHomeCardDesc">
              Pregled svih narudžbi, vremena kreiranja, preuzimanja i završavanja.
            </div>

            <div className="adminHomeCardFooter">
              <span className="adminHomeCardArrow" aria-hidden="true">
                →
              </span>
            </div>
          </Link>

          <Link to="/admin/room-service-hours" className="adminHomeCard">
            <div className="adminHomeCardTop">
              <div className="adminHomeIconWrap">
                <span className="adminHomeIcon" aria-hidden="true">🕒</span>
              </div>
              <div className="adminHomeCardHeading">
                <div className="adminHomeCardEyebrow">Room Service</div>
                <div className="adminHomeCardTitle">Radno vrijeme</div>
              </div>
            </div>
            <div className="adminHomeCardDesc">Odredite raspored rada i privremeno zatvorite Room Service.</div>
            <div className="adminHomeCardFooter"><span className="adminHomeCardArrow" aria-hidden="true">→</span></div>
          </Link>

          {/* <Link to="/admin/waiters" className="adminHomeCard">
            <div className="adminHomeCardTop">
              <div className="adminHomeIconWrap">
                <span className="adminHomeIcon" aria-hidden="true">
                  🧑‍💼
                </span>
              </div>

              <div className="adminHomeCardHeading">
                <div className="adminHomeCardEyebrow">Team</div>
                <div className="adminHomeCardTitle">Upravljaj osobljem</div>
              </div>
            </div>

            <div className="adminHomeCardDesc">
              Dodajte, onemogućite ili uklonite račune osoblja.
            </div>

            <div className="adminHomeCardFooter">
              <span className="adminHomeCardArrow" aria-hidden="true">
                →
              </span>
            </div>
          </Link> */}

          {/* <Link to="/massage-dashboard" className="adminHomeCard">
            <div className="adminHomeCardTop">
              <div className="adminHomeIconWrap">
                <span className="adminHomeIcon" aria-hidden="true">
                  💆
                </span>
              </div>

              <div className="adminHomeCardHeading">
                <div className="adminHomeCardEyebrow">Wellness</div>
                <div className="adminHomeCardTitle">Dashboard za maserku</div>
              </div>
            </div>

            <div className="adminHomeCardDesc">
              Pregled termina, zahtjeva gostiju i dostupnih slotova za masaže.
            </div>

            <div className="adminHomeCardFooter">
              <span className="adminHomeCardArrow" aria-hidden="true">
                →
              </span>
            </div>
          </Link> */}
        </div>
      </div>
    </div>
  );
}
