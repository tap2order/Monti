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
const tables = new Map([["1", { id: "1", name: "Soba 1", token: "table-token", isActive: true }]]);
const menuItems = [{ id: "coffee", name: "Coffee", price: 2.5 }];
function reset() { orders = []; }
reset();

const fakePrisma = {
  table: { findUnique: async ({ where }) => tables.get(String(where.id)) || null },
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
  const response = await request("/api/public/rooms/1/bootstrap", { method: "POST", body: { token: "table-token" } });
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
