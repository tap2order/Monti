const assert = require("node:assert/strict");
const test = require("node:test");
const Module = require("node:module");

process.env.ADMIN_USER = "admin";
process.env.ADMIN_PASS = "secret";
process.env.PUBLIC_CLIENT_URL = "http://localhost:5173";
process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";

let calls = [];
let nextCallId = 1;
let tables = new Map();
let waiters = new Map();

function resetData() {
  nextCallId = 1;
  tables = new Map([
    ["1", { id: "1", name: "Table 1", token: "table-token", isActive: true }],
  ]);
  waiters = new Map([
    [1, { id: 1, name: "Adnan", isActive: true }],
    [2, { id: 2, name: "Inactive", isActive: false }],
  ]);
  calls = [
    {
      id: "call-1",
      tableId: "1",
      type: "waiter",
      status: "OPEN",
      createdAt: new Date("2026-01-01T10:00:00.000Z"),
      handledAt: null,
      handledById: null,
    },
  ];
}

resetData();

const fakePrisma = {
  table: {
    findUnique: async ({ where }) => tables.get(String(where.id)) || null,
  },
  waiter: {
    findUnique: async ({ where }) => waiters.get(Number(where.id)) || null,
  },
  call: {
    create: async ({ data }) => {
      const call = {
        id: `call-${++nextCallId}`,
        ...data,
        createdAt: new Date(),
        handledAt: null,
        handledById: null,
      };
      calls.push(call);
      return call;
    },
    findMany: async ({ where }) =>
      calls
        .filter((call) => !where?.status || call.status === where.status)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
    findUnique: async ({ where }) =>
      calls.find((call) => call.id === String(where.id)) || null,
    update: async ({ where, data }) => {
      const index = calls.findIndex((call) => call.id === String(where.id));
      if (index === -1) throw new Error("call not found");
      calls[index] = { ...calls[index], ...data };
      return calls[index];
    },
  },
};

const originalLoad = Module._load;
Module._load = function load(request, parent, isMain) {
  if (request === "@prisma/client") {
    return { PrismaClient: function PrismaClient() {
      return fakePrisma;
    } };
  }
  return originalLoad.call(this, request, parent, isMain);
};

const { app } = require("./index");

Module._load = originalLoad;

let testServer;
let baseUrl;

function adminAuthHeader() {
  return `Basic ${Buffer.from("admin:secret").toString("base64")}`;
}

async function request(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (options.body && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  return fetch(`${baseUrl}${path}`, {
    ...options,
    headers,
    body:
      options.body && typeof options.body !== "string"
        ? JSON.stringify(options.body)
        : options.body,
  });
}

test.before(async () => {
  await new Promise((resolve) => {
    testServer = app.listen(0, "127.0.0.1", () => {
      const address = testServer.address();
      baseUrl = `http://127.0.0.1:${address.port}`;
      resolve();
    });
  });
});

test.after(async () => {
  await new Promise((resolve, reject) => {
    testServer.close((err) => (err ? reject(err) : resolve()));
  });
});

test.beforeEach(() => {
  resetData();
});

test("anonymous user cannot list open calls", async () => {
  const res = await request("/calls/open");

  assert.equal(res.status, 401);
  assert.deepEqual(await res.json(), { error: "staff auth required" });
});

test("anonymous user cannot mark a call as handled", async () => {
  const res = await request("/calls/call-1/handle", {
    method: "PATCH",
    body: { waiterId: 1 },
  });

  assert.equal(res.status, 401);
  assert.deepEqual(await res.json(), { error: "staff auth required" });
});

test("authorized waiter can list open calls", async () => {
  const res = await request("/calls/open", {
    headers: { "X-Waiter-Id": "1" },
  });

  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.length, 1);
  assert.equal(body[0].id, "call-1");
});

test("authorized admin can list open calls", async () => {
  const res = await request("/calls/open", {
    headers: { Authorization: adminAuthHeader() },
  });

  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.length, 1);
  assert.equal(body[0].id, "call-1");
});

test("authorized waiter can mark a call as handled", async () => {
  const res = await request("/calls/call-1/handle", {
    method: "PATCH",
    headers: { "X-Waiter-Id": "1" },
    body: { waiterId: 1 },
  });

  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.id, "call-1");
  assert.equal(body.status, "HANDLED");
  assert.equal(body.handledById, 1);
  assert.ok(body.handledAt);
});

test("guest can still create a call with a valid table token", async () => {
  const res = await request("/calls", {
    method: "POST",
    body: { tableId: "1", token: "table-token", type: "bill" },
  });

  assert.equal(res.status, 201);
  const body = await res.json();
  assert.equal(body.tableId, "1");
  assert.equal(body.type, "bill");
  assert.equal(body.status, "OPEN");
});
