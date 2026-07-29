import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { adminFetch, isAdminLoggedIn } from "../adminAuth";
import "../css/AdminRoomServiceHoursPage.css";

const API = import.meta.env.VITE_API_URL || "";
const DAYS = ["Ponedjeljak", "Utorak", "Srijeda", "Četvrtak", "Petak", "Subota", "Nedjelja"];
const initialSchedule = () => DAYS.map(() => ({ isOpen: true, opensAt: "07:00", closesAt: "23:00" }));

export default function AdminRoomServiceHoursPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    enabled: false, timezone: "Europe/Sarajevo", weeklySchedule: initialSchedule(),
    temporaryClosed: false, closedMessage: "",
  });
  const [notice, setNotice] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isAdminLoggedIn()) {
      navigate("/admin");
      return;
    }
    adminFetch(`${API}/api/admin/room-service-settings`)
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Nije moguće učitati postavke.");
        setForm({ ...data, weeklySchedule: Array.isArray(data.weeklySchedule) ? data.weeklySchedule : initialSchedule(), closedMessage: data.closedMessage || "" });
      })
      .catch((error) => setNotice({ type: "error", text: error.message }));
  }, [navigate]);

  const updateDay = (index, patch) => setForm((current) => ({
    ...current,
    weeklySchedule: current.weeklySchedule.map((day, dayIndex) => dayIndex === index ? { ...day, ...patch } : day),
  }));

  const applyAll = () => setForm((current) => {
    const source = current.weeklySchedule.find((day) => day.isOpen) || { opensAt: "07:00", closesAt: "23:00" };
    return { ...current, weeklySchedule: current.weeklySchedule.map((day) => ({ ...day, opensAt: source.opensAt, closesAt: source.closesAt })) };
  });

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    setNotice(null);
    try {
      const response = await adminFetch(`${API}/api/admin/room-service-settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Spremanje nije uspjelo.");
      setForm({ ...data, closedMessage: data.closedMessage || "" });
      setNotice({ type: "success", text: "Postavke su uspješno spremljene i odmah aktivne." });
    } catch (error) {
      setNotice({ type: "error", text: error.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="roomHoursPage">
      <div className="roomHoursShell">
        <button type="button" className="roomHoursBack" onClick={() => navigate("/admin/home")}>← Vrati na admin dashboard</button>
        <header className="roomHoursHero">
          <div className="roomHoursKicker">Room Service</div>
          <h1>Radno vrijeme Room Service-a</h1>
          <p>Odredite kada gosti mogu poslati narudžbu.</p>
        </header>

        <form className="roomHoursForm" onSubmit={save}>
          <section className="roomHoursCard">
            <h2>Opće postavke</h2>
            <label className="roomHoursToggle">
              <input type="checkbox" checked={form.enabled} onChange={(event) => setForm({ ...form, enabled: event.target.checked })} />
              <span className="roomHoursSwitch" aria-hidden="true" />
              <span><strong>Ograniči naručivanje na radno vrijeme</strong><small>Isključeno znači da Room Service radi 24/7.</small></span>
            </label>
            <label className="roomHoursField"><span>Vremenska zona</span><input required value={form.timezone} onChange={(event) => setForm({ ...form, timezone: event.target.value })} /></label>
          </section>

          <section className="roomHoursCard">
            <div className="roomHoursSectionHead"><div><h2>Sedmični raspored</h2><p>Raspored može prelaziti preko ponoći.</p></div><button type="button" className="roomHoursButton roomHoursSecondary" onClick={applyAll}>Isto vrijeme za sve dane</button></div>
            <div className="roomHoursSchedule">
              {form.weeklySchedule.map((day, index) => (
                <div className="roomHoursDay" key={DAYS[index]}>
                  <strong>{DAYS[index]}</strong>
                  <label className="roomHoursCheck"><input type="checkbox" checked={day.isOpen} onChange={(event) => updateDay(index, { isOpen: event.target.checked })} /> Radi</label>
                  <input type="time" required={day.isOpen} disabled={!day.isOpen} value={day.opensAt || ""} onChange={(event) => updateDay(index, { opensAt: event.target.value })} />
                  <span>–</span>
                  <input type="time" required={day.isOpen} disabled={!day.isOpen} value={day.closesAt || ""} onChange={(event) => updateDay(index, { closesAt: event.target.value })} />
                </div>
              ))}
            </div>
          </section>

          <section className="roomHoursCard">
            <h2>Privremeno zatvaranje</h2>
            <label className="roomHoursToggle">
              <input type="checkbox" checked={form.temporaryClosed} onChange={(event) => setForm({ ...form, temporaryClosed: event.target.checked })} />
              <span className="roomHoursSwitch" aria-hidden="true" />
              <span><strong>Privremeno zatvori Room Service</strong><small>Ova opcija ima prednost nad rasporedom.</small></span>
            </label>
            <label className="roomHoursField"><span>Poruka za goste (opcionalno)</span><textarea maxLength="500" rows="3" value={form.closedMessage} onChange={(event) => setForm({ ...form, closedMessage: event.target.value })} /></label>
          </section>

          <footer className="roomHoursActions">
            {notice && <p className={`roomHoursNotice ${notice.type}`}>{notice.text}</p>}
            <button className="roomHoursButton roomHoursPrimary" disabled={saving}>{saving ? "Spremanje…" : "Spremi postavke"}</button>
          </footer>
        </form>
      </div>
    </main>
  );
}
