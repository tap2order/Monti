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

let orders;
let roomSessions;
const tables = new Map([
  ["1", { id: "1", name: "Soba 1", token: "table-token", isActive: true }],
  ["2", { id: "2", name: "Soba 2", token: "second-token", isActive: true }],
]);
const menuItems = [{ id: "coffee", name: "Coffee", price: 2.5 }];
function reset() { orders = []; roomSessions = []; }
reset();

const fakePrisma = {
  table: { findUnique: async ({ where }) => tables.get(String(where.id)) || null },
  roomVerificationSession: {
    create: async ({ data }) => { const session = { id: `session-${roomSessions.length + 1}`, ...data, revokedAt: null }; roomSessions.push(session); return session; },
    findUnique: async ({ where }) => { const session = roomSessions.find((item) => item.tokenHash === where.tokenHash); return session ? { ...session, room: tables.get(session.roomId) } : null; },
    update: async ({ where, data }) => { const session = roomSessions.find((item) => item.id === where.id); Object.assign(session, data); return session; },
  },
  menuItem: { findMany: async ({ where }) => menuItems.filter((item) => where.id.in.includes(item.id)) },
  order: {
    findUnique: async ({ where }) => orders.find((order) => order.id === where.id || order.clientRequestId === where.clientRequestId) || null,
    findMany: async ({ where }) => orders.filter((order) => !where?.status || order.status === where.status),
    create: async ({ data }) => {
      const order = { id: `order-${orders.length + 1}`, tableId: data.tableId, clientRequestId: data.clientRequestId, status: data.status, createdAt: new Date(), claimedAt: null, completedAt: null, claimedById: null, items: data.items.create.map((item, index) => ({ id: `item-${index}`, ...item })) };
      orders.push(order);
      return order;
    },
    updateMany: async ({ where, data }) => {
      const order = orders.find((item) => item.id === where.id && item.status === where.status);
      if (!order) return { count: 0 };
      Object.assign(order, data);
      return { count: 1 };
    },
    delete: async ({ where }) => {
      const index = orders.findIndex((order) => order.id === where.id);
      if (index < 0) { const error = new Error("missing"); error.code = "P2025"; throw error; }
      return orders.splice(index, 1)[0];
    },
  },
  call: { findMany: async () => [] },
};
const originalLoad = Module._load;
Module._load = function load(request, parent, isMain) {
  if (request === "@prisma/client") return { PrismaClient: function PrismaClient() { return fakePrisma; } };
  return originalLoad.call(this, request, parent, isMain);
};
const { app } = require("./index");
Module._load = originalLoad;

let testServer;
let baseUrl;
async function request(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (options.body) headers["Content-Type"] ||= "application/json";
  return fetch(`${baseUrl}${path}`, { ...options, headers, body: options.body && typeof options.body !== "string" ? JSON.stringify(options.body) : options.body });
}
async function staffToken() {
  const response = await request("/auth/staff/login", { method: "POST", body: { pin: "123456" } });
  return (await response.json()).token;
}
async function roomCookie() {
  const response = await request("/api/guest/room-session/bootstrap", { method: "POST", body: { roomId: "1", token: "table-token" } });
  const cookie = response.headers.get("set-cookie").split(";")[0];
  const verified = await request("/api/guest/room-session/verify", { method: "POST", headers: { Cookie: cookie }, body: { scannedValue: "http://localhost:5173/t/1?token=table-token" } });
  assert.equal(verified.status, 200);
  return cookie;
}
async function pendingCookie() {
  const response = await request("/api/guest/room-session/bootstrap", { method: "POST", body: { roomId: "1", token: "table-token" } });
  assert.equal(response.status, 201);
  return response.headers.get("set-cookie").split(";")[0];
}
test.before(async () => { await new Promise((resolve) => { testServer = app.listen(0, "127.0.0.1", () => { baseUrl = `http://127.0.0.1:${testServer.address().port}`; resolve(); }); }); });
test.after(async () => { await new Promise((resolve, reject) => testServer.close((error) => error ? reject(error) : resolve())); });
test.beforeEach(reset);

test("anonymous and spoofed waiter headers cannot read orders", async () => {
  assert.equal((await request("/orders/unclaimed")).status, 401);
  assert.equal((await request("/orders/unclaimed", { headers: { "X-Waiter-Id": "1" } })).status, 401);
});
test("staff token can read and claim an order", async () => {
  const token = await staffToken();
  await request("/orders", { method: "POST", headers: { "Idempotency-Key": "request-key-000001", Cookie: await roomCookie() }, body: { items: [{ itemId: "coffee", qty: 1 }] } });
  const response = await request("/orders/order-1/claim", { method: "PATCH", headers: { Authorization: `Bearer ${token}` } });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).status, "CLAIMED");
});
test("order prices and names are always snapshotted from the server menu", async () => {
  const response = await request("/orders", { method: "POST", headers: { "Idempotency-Key": "request-key-000002", Cookie: await roomCookie() }, body: { items: [{ itemId: "coffee", name: "Free food", price: -100, qty: 2 }] } });
  assert.equal(response.status, 201);
  const order = await response.json();
  assert.deepEqual(order.items[0], { id: "item-0", itemId: "coffee", name: "Coffee", price: 2.5, qty: 2, note: null });
});
test("idempotency key prevents duplicate orders", async () => {
  const options = { method: "POST", headers: { "Idempotency-Key": "request-key-000003", Cookie: await roomCookie() }, body: { items: [{ itemId: "coffee", qty: 1 }] } };
  assert.equal((await request("/orders", options)).status, 201);
  assert.equal((await request("/orders", options)).status, 200);
  assert.equal(orders.length, 1);
});

test("pending session survives refresh but cannot access protected endpoints", async () => {
  const cookie = await pendingCookie();
  const status = await request("/api/guest/room-session", { headers: { Cookie: cookie } });
  assert.equal((await status.json()).status, "verification_required");
  const blocked = await request("/api/public/menu", { headers: { Cookie: cookie } });
  assert.equal(blocked.status, 403);
  assert.equal((await blocked.json()).code, "ROOM_VERIFICATION_REQUIRED");
});

test("verification rejects wrong origin, path, extra query and duplicate token", async () => {
  for (const scannedValue of [
    "https://evil.example/t/1?token=table-token",
    "http://localhost:5173/t/1/extra?token=table-token",
    "http://localhost:5173/t/1?token=table-token&extra=1",
    "http://localhost:5173/t/1?token=table-token&token=table-token",
  ]) {
    const response = await request("/api/guest/room-session/verify", {
      method: "POST", headers: { Cookie: await pendingCookie() }, body: { scannedValue },
    });
    assert.equal(response.status, 403);
  }
});

test("verification rejects a QR for another room", async () => {
  const response = await request("/api/guest/room-session/verify", {
    method: "POST",
    headers: { Cookie: await pendingCookie() },
    body: { scannedValue: "http://localhost:5173/t/2?token=second-token" },
  });
  assert.equal(response.status, 403);
});

test("expired, revoked and room-mismatched sessions are blocked", async () => {
  const expiredCookie = await roomCookie();
  roomSessions.at(-1).expiresAt = new Date(Date.now() - 1000);
  assert.equal((await request("/api/public/room-service/availability", { headers: { Cookie: expiredCookie } })).status, 401);

  const revokedCookie = await roomCookie();
  roomSessions.at(-1).revokedAt = new Date();
  const revoked = await request("/api/public/room-service/availability", { headers: { Cookie: revokedCookie } });
  assert.equal((await revoked.json()).code, "ROOM_SESSION_REVOKED");

  const validCookie = await roomCookie();
  const mismatch = await request("/api/public/room-service/availability?roomId=2", { headers: { Cookie: validCookie } });
  assert.equal(mismatch.status, 403);
  assert.equal((await mismatch.json()).code, "ROOM_SESSION_ROOM_MISMATCH");
});

test("reverify replaces an expired session with an immediately verified session", async () => {
  const oldCookie = await roomCookie();
  roomSessions.at(-1).expiresAt = new Date(Date.now() - 1000);
  const response = await request("/api/guest/room-session/reverify", {
    method: "POST",
    headers: { Cookie: oldCookie },
    body: { roomId: "1", scannedValue: "http://localhost:5173/t/1?token=table-token" },
  });
  assert.equal(response.status, 201);
  const newCookie = response.headers.get("set-cookie").split(";")[0];
  const status = await request("/api/guest/room-session", { headers: { Cookie: newCookie } });
  assert.equal((await status.json()).status, "verified");
});
