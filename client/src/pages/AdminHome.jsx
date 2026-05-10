import { Link, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { isAdminLoggedIn } from "../adminAuth";
import "../css/AdminHome.css";

export default function AdminHome() {
  const nav = useNavigate();

  useEffect(() => {
    if (!isAdminLoggedIn()) nav("/admin");
  }, [nav]);

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

          <div className="adminHomeHeroActions">
            <Link className="adminHomeBtn adminHomeBtnPrimary" to="/waiter">
              Otvori dashboard za osoblje
            </Link>
          </div>
        </div>

        <div className="adminHomeGrid">
          <Link to="/admin/tables" className="adminHomeCard is-featured">
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