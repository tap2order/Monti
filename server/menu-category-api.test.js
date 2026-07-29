const assert = require("node:assert/strict");
const test = require("node:test");
const Module = require("node:module");

process.env.ADMIN_USER = "admin";
process.env.ADMIN_PASS = "password";
process.env.STAFF_PIN = "123456";
process.env.AUTH_SECRET = "test-secret-that-is-long-enough-for-signing";
process.env.PUBLIC_CLIENT_URL = "http://localhost:5173";
process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";

let categories;
let roomSessions;
const room = { id: "1", token: "table-token", isActive: true };

function reset() {
  categories = [{
    id: "drinks",
    name: "Topli napici",
    group: "DRINKS",
    items: [{ id: "coffee", name: "Espresso", isActive: true }],
  }];
  roomSessions = [];
}
reset();

const fakePrisma = {
  table: {
    findUnique: async ({ where }) => String(where.id) === room.id ? room : null,
  },
  roomVerificationSession: {
    create: async ({ data }) => {
      const session = { id: `session-${roomSessions.length + 1}`, ...data, revokedAt: null };
      roomSessions.push(session);
      return session;
    },
    findUnique: async ({ where }) => {
      const session = roomSessions.find((entry) => entry.tokenHash === where.tokenHash);
      return session ? { ...session, room } : null;
    },
    update: async ({ where, data }) => {
      const session = roomSessions.find((entry) => entry.id === where.id);
      Object.assign(session, data);
      return session;
    },
  },
  menuCategory: {
    findMany: async () => categories.map((category) => ({ ...category, items: [...category.items] })),
    create: async ({ data }) => {
      const category = { id: `category-${categories.length + 1}`, ...data, items: [] };
      categories.push(category);
      return category;
    },
    update: async ({ where, data }) => {
      const category = categories.find((entry) => entry.id === where.id);
      if (!category) {
        const error = new Error("missing");
        error.code = "P2025";
        throw error;
      }
      Object.assign(category, data);
      return category;
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
  return fetch(`${baseUrl}${path}`, {
    ...options,
    headers,
    body: options.body && typeof options.body !== "string" ? JSON.stringify(options.body) : options.body,
  });
}

async function adminToken() {
  const response = await request("/auth/admin/login", {
    method: "POST",
    body: { username: "admin", password: "password" },
  });
  return (await response.json()).token;
}

async function verifiedRoomCookie() {
  const bootstrap = await request("/api/guest/room-session/bootstrap", {
    method: "POST",
    body: { roomId: "1", token: "table-token" },
  });
  const cookie = bootstrap.headers.get("set-cookie").split(";")[0];
  const verified = await request("/api/guest/room-session/verify", {
    method: "POST",
    headers: { Cookie: cookie },
    body: { scannedValue: "http://localhost:5173/t/1?token=table-token" },
  });
  assert.equal(verified.status, 200);
  return cookie;
}

test.before(async () => {
  await new Promise((resolve) => {
    testServer = app.listen(0, "127.0.0.1", () => {
      baseUrl = `http://127.0.0.1:${testServer.address().port}`;
      resolve();
    });
  });
});
test.after(async () => {
  await new Promise((resolve, reject) => testServer.close((error) => error ? reject(error) : resolve()));
});
test.beforeEach(reset);

test("category creation requires a supported group and returns it", async () => {
  const token = await adminToken();
  const invalid = await request("/menu-category", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: { name: "Invalid", group: "BEVERAGES" },
  });
  assert.equal(invalid.status, 400);

  const created = await request("/menu-category", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: { name: "Pizza", group: "FOOD" },
  });
  assert.equal(created.status, 201);
  assert.equal((await created.json()).group, "FOOD");
});

test("category group can be edited but invalid values are rejected", async () => {
  const token = await adminToken();
  const updated = await request("/menu-category/drinks", {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}` },
    body: { group: "DESSERTS" },
  });
  assert.equal(updated.status, 200);
  assert.equal((await updated.json()).group, "DESSERTS");

  const invalid = await request("/menu-category/drinks", {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}` },
    body: { group: "INVALID" },
  });
  assert.equal(invalid.status, 400);
});

test("menu APIs return stored category groups without removing existing categories", async () => {
  const adminMenu = await request("/menu");
  assert.equal(adminMenu.status, 200);
  assert.equal((await adminMenu.json())[0].group, "DRINKS");

  const publicMenu = await request("/api/public/menu", {
    headers: { Cookie: await verifiedRoomCookie() },
  });
  assert.equal(publicMenu.status, 200);
  const payload = await publicMenu.json();
  assert.equal(payload.length, 1);
  assert.equal(payload[0].name, "Topli napici");
  assert.equal(payload[0].group, "DRINKS");
  assert.equal(payload[0].items.length, 1);
});
