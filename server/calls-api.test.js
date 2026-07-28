const assert = require("node:assert/strict");
const test = require("node:test");
const Module = require("node:module");

process.env.ADMIN_USER = "admin";
process.env.ADMIN_PASS = "password";
process.env.STAFF_PIN = "123456";
process.env.AUTH_SECRET = "test-secret-that-is-long-enough-for-signing";
process.env.PUBLIC_CLIENT_URL = "http://localhost:5173";
process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";
process.env.ROOM_SERVICE_OPENS_AT = "00:00";
process.env.ROOM_SERVICE_CLOSES_AT = "00:00";

let calls;
let roomSessions;
const room = { id: "1", token: "table-token", isActive: true };
const fakePrisma = {
  table: { findUnique: async ({ where }) => String(where.id) === "1" ? room : null },
  roomVerificationSession: {
    create: async ({ data }) => { const session = { id: `session-${roomSessions.length + 1}`, ...data, revokedAt: null }; roomSessions.push(session); return session; },
    findUnique: async ({ where }) => { const session = roomSessions.find((item) => item.tokenHash === where.tokenHash); return session ? { ...session, room } : null; },
    update: async ({ where, data }) => { const session = roomSessions.find((item) => item.id === where.id); Object.assign(session, data); return session; },
  },
  call: {
    create: async ({ data }) => { const call = { id: `call-${calls.length + 1}`, ...data, createdAt: new Date(), handledAt: null, handledById: null }; calls.push(call); return call; },
    findMany: async ({ where }) => calls.filter((call) => call.status === where.status),
    findUnique: async ({ where }) => calls.find((call) => call.id === where.id) || null,
    updateMany: async ({ where, data }) => { const call = calls.find((item) => item.id === where.id && item.status === where.status); if (!call) return { count: 0 }; Object.assign(call, data); return { count: 1 }; },
  },
};
const originalLoad = Module._load;
Module._load = function load(request, parent, isMain) { if (request === "@prisma/client") return { PrismaClient: function PrismaClient() { return fakePrisma; } }; return originalLoad.call(this, request, parent, isMain); };
const { app } = require("./index");
Module._load = originalLoad;
let testServer; let baseUrl;
async function request(path, options = {}) { const headers = { ...(options.headers || {}) }; if (options.body) headers["Content-Type"] ||= "application/json"; return fetch(`${baseUrl}${path}`, { ...options, headers, body: options.body && typeof options.body !== "string" ? JSON.stringify(options.body) : options.body }); }
async function staffToken() { const response = await request("/auth/staff/login", { method: "POST", body: { pin: "123456" } }); return (await response.json()).token; }
async function roomCookie() { const response = await request("/api/guest/room-session/bootstrap", { method: "POST", body: { roomId: "1", token: "table-token" } }); const cookie = response.headers.get("set-cookie").split(";")[0]; await request("/api/guest/room-session/verify", { method: "POST", headers: { Cookie: cookie }, body: { scannedValue: "http://localhost:5173/t/1?token=table-token" } }); return cookie; }
test.before(async () => { calls = []; roomSessions = []; await new Promise((resolve) => { testServer = app.listen(0, "127.0.0.1", () => { baseUrl = `http://127.0.0.1:${testServer.address().port}`; resolve(); }); }); });
test.after(async () => { await new Promise((resolve, reject) => testServer.close((error) => error ? reject(error) : resolve())); });
test.beforeEach(() => { calls = []; roomSessions = []; });

test("guest requires a valid room credential and allowed call type", async () => {
  assert.equal((await request("/calls", { method: "POST", body: { type: "waiter" } })).status, 401);
  assert.equal((await request("/calls", { method: "POST", headers: { Cookie: await roomCookie() }, body: { type: "anything" } })).status, 400);
});
test("staff token is required to list and handle calls", async () => {
  const created = await request("/calls", { method: "POST", headers: { Cookie: await roomCookie() }, body: { type: "bill" } });
  assert.equal(created.status, 201);
  assert.equal((await request("/calls/open", { headers: { "X-Waiter-Id": "1" } })).status, 401);
  const token = await staffToken();
  const list = await request("/calls/open", { headers: { Authorization: `Bearer ${token}` } });
  assert.equal(list.status, 200);
  const handled = await request("/calls/call-1/handle", { method: "PATCH", headers: { Authorization: `Bearer ${token}` } });
  assert.equal(handled.status, 200);
  assert.equal((await handled.json()).status, "HANDLED");
});
