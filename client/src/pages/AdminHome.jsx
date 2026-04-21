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
      <div className="adminHomeWrap">
        <div className="adminHomeHeader">
          <div>
            <h1 className="adminHomeTitle">Hotel Dashboard</h1>
            <p className="adminHomeSubtitle">
              Upravljaj sobama, osobljem, zahtjevima gostiju i room service-om.
            </p>
          </div>

          <Link className="adminHomeBtn" to="/waiter">
            Otvori dashboard za osoblje
          </Link>
        </div>

        <div className="adminHomeGrid">
          <Link to="/admin/tables" className="adminHomeCard">
            <div className="adminHomeCardTop">
              <span className="adminHomeIcon">🛏️</span>
              <span className="adminHomeCardTitle">Pogledaj sobe</span>
            </div>
            <div className="adminHomeCardDesc">
              Pregledajte sobe i otvorite stranice soba za goste.
            </div>
          </Link>

          <Link to="/waiter" className="adminHomeCard">
            <div className="adminHomeCardTop">
              <span className="adminHomeIcon">🛎️</span>
              <span className="adminHomeCardTitle">Dashboard za osoblje</span>
            </div>
            <div className="adminHomeCardDesc">
              Pratite narudžbe u sobi i zahtjeve gostiju uživo.
            </div>
          </Link>

          <Link to="/admin/waiters" className="adminHomeCard">
            <div className="adminHomeCardTop">
              <span className="adminHomeIcon">🧑‍💼</span>
              <span className="adminHomeCardTitle">Upravljaj osobljem</span>
            </div>
            <div className="adminHomeCardDesc">
              Dodajte, onemogućite ili uklonite račune osoblja..
            </div>
          </Link>

          <Link to="/admin/menu" className="adminHomeCard">
            <div className="adminHomeCardTop">
              <span className="adminHomeIcon">🍽️</span>
              <span className="adminHomeCardTitle">Room Service Menu</span>
            </div>
            <div className="adminHomeCardDesc">
              Uredite kategorije, stavke menija i dostupnost.
            </div>
          </Link>


          <Link to="/massage-dashboard" className="adminHomeCard">
  <div className="adminHomeCardTop">
    <span className="adminHomeIcon">💆</span>
    <span className="adminHomeCardTitle">Dashboard za maserku</span>
  </div>
  <div className="adminHomeCardDesc">
    Pregled termina,zahtjeva gostiju i dostupnih slotova za masaže.
  </div>
</Link>

        </div>
      </div>
    </div>
  );
}