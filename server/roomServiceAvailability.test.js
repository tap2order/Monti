const test = require("node:test");
const assert = require("node:assert/strict");
const { getRoomServiceAvailability } = require("./roomServiceAvailability");

const weekly = (overrides = {}) => Array.from({ length: 7 }, (_, index) => overrides[index] || { isOpen: true, opensAt: "07:00", closesAt: "23:00" });

test("disabled or missing settings retain 24/7 ordering", () => {
  assert.equal(getRoomServiceAvailability(null, new Date("2026-01-05T02:00:00Z")).isOpen, true);
  assert.equal(getRoomServiceAvailability({ enabled: false }, new Date("2026-01-05T02:00:00Z")).isOpen, true);
});

test("opening is inclusive and closing is exclusive", () => {
  const settings = { enabled: true, timezone: "Europe/Sarajevo", weeklySchedule: weekly() };
  assert.equal(getRoomServiceAvailability(settings, new Date("2026-01-05T06:00:00Z")).isOpen, true);
  assert.equal(getRoomServiceAvailability(settings, new Date("2026-01-05T22:00:00Z")).isOpen, false);
});

test("overnight schedule continues after midnight", () => {
  const settings = { enabled: true, timezone: "Europe/Sarajevo", weeklySchedule: weekly({ 4: { isOpen: true, opensAt: "18:00", closesAt: "02:00" } }) };
  assert.equal(getRoomServiceAvailability(settings, new Date("2026-01-10T00:30:00Z")).isOpen, true);
  assert.equal(getRoomServiceAvailability(settings, new Date("2026-01-10T01:00:00Z")).isOpen, false);
});

test("temporary closure overrides weekly hours", () => {
  const result = getRoomServiceAvailability({ enabled: true, temporaryClosed: true, closedMessage: "Održavanje", weeklySchedule: weekly() });
  assert.equal(result.isOpen, false);
  assert.equal(result.reason, "temporary_closed");
  assert.equal(result.message, "Održavanje");
});
