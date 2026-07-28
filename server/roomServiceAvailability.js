const DAY_NAMES = ["Ponedjeljak", "Utorak", "Srijeda", "Četvrtak", "Petak", "Subota", "Nedjelja"];
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

function defaultSchedule() {
  return DAY_NAMES.map(() => ({ isOpen: true, opensAt: "07:00", closesAt: "23:00" }));
}

function isValidTimezone(timezone) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone }).format();
    return true;
  } catch {
    return false;
  }
}

function normalizeSchedule(schedule) {
  if (!Array.isArray(schedule) || schedule.length !== 7) throw new Error("Raspored mora sadržavati svih sedam dana.");
  return schedule.map((day) => {
    const isOpen = Boolean(day?.isOpen);
    if (!isOpen) return { isOpen: false, opensAt: null, closesAt: null };
    const opensAt = TIME_RE.test(String(day?.opensAt || "")) ? String(day.opensAt) : null;
    const closesAt = TIME_RE.test(String(day?.closesAt || "")) ? String(day.closesAt) : null;
    if (!opensAt || !closesAt) throw new Error("Vrijeme mora biti u formatu HH:mm.");
    if (opensAt === closesAt) throw new Error("Vrijeme otvaranja i zatvaranja ne može biti isto.");
    return { isOpen: true, opensAt, closesAt };
  });
}

function localParts(now, timezone) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23", weekday: "short",
  }).formatToParts(now);
  const get = (type) => parts.find((part) => part.type === type)?.value;
  const weekdays = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };
  return { date: `${get("year")}-${get("month")}-${get("day")}`, time: `${get("hour")}:${get("minute")}`, weekday: weekdays[get("weekday")] };
}

function minutes(time) {
  const [hours, mins] = time.split(":").map(Number);
  return hours * 60 + mins;
}

function getRoomServiceAvailability(settings, now = new Date()) {
  const timezone = settings?.timezone && isValidTimezone(settings.timezone) ? settings.timezone : "Europe/Sarajevo";
  const local = localParts(now, timezone);
  const base = { timezone, currentLocalTime: `${local.date} ${local.time}` };
  if (!settings || !settings.enabled) return { isOpen: true, reason: null, ...base, todayHours: null, nextOpenAt: null, message: null };
  if (settings.temporaryClosed) {
    return { isOpen: false, reason: "temporary_closed", ...base, todayHours: null, nextOpenAt: null, message: settings.closedMessage || "Room service trenutno ne radi." };
  }

  let schedule;
  try { schedule = normalizeSchedule(settings.weeklySchedule); } catch { schedule = defaultSchedule(); }
  const current = minutes(local.time);
  const today = schedule[local.weekday];
  const previous = schedule[(local.weekday + 6) % 7];
  const isOpenNow = (day) => day?.isOpen && (minutes(day.opensAt) < minutes(day.closesAt)
    ? current >= minutes(day.opensAt) && current < minutes(day.closesAt)
    : current >= minutes(day.opensAt) || current < minutes(day.closesAt));
  const openFromPreviousDay = previous?.isOpen
    && minutes(previous.opensAt) > minutes(previous.closesAt)
    && current < minutes(previous.closesAt);
  const todayHours = today?.isOpen ? { opensAt: today.opensAt, closesAt: today.closesAt } : null;
  if (isOpenNow(today) || openFromPreviousDay) {
    return { isOpen: true, reason: null, ...base, todayHours, nextOpenAt: null, message: null };
  }

  let nextOpenAt = null;
  for (let offset = 0; offset < 7; offset += 1) {
    const dayIndex = (local.weekday + offset) % 7;
    const day = schedule[dayIndex];
    if (!day?.isOpen) continue;
    if (offset === 0 && current >= minutes(day.opensAt) && minutes(day.opensAt) < minutes(day.closesAt)) continue;
    nextOpenAt = offset === 0 ? `danas od ${day.opensAt}` : offset === 1 ? `sutra od ${day.opensAt}` : `${DAY_NAMES[dayIndex]} od ${day.opensAt}`;
    break;
  }
  return { isOpen: false, reason: "outside_operating_hours", ...base, todayHours, nextOpenAt, message: "Room service trenutno ne radi." };
}

module.exports = { DAY_NAMES, defaultSchedule, isValidTimezone, normalizeSchedule, getRoomServiceAvailability };
