const assert = require("node:assert/strict");
const test = require("node:test");
const Module = require("node:module");

process.env.ADMIN_USER = "admin";
process.env.ADMIN_PASS = "secret";
process.env.PUBLIC_CLIENT_URL = "http://localhost:5173";
process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";

let orders = [];
let nextOrderId = 1;
let tables = new Map();
let waiters = new Map();

function orderItems(orderId) {
  return [
    {
      id: `${orderId}-item-1`,
      orderId,
      itemId: "coffee",
      name: "Coffee",
      price: 2.5,
      qty: 1,
      note: null,
    },
  ];
}

function resetData() {
  nextOrderId = 1;
  tables = new Map([
    ["1", { id: "1", name: "Table 1", token: "table-token", isActive: true }],
  ]);
  waiters = new Map([
    [1, { id: 1, name: "Adnan", isActive: true }],
    [2, { id: 2, name: "Inactive", isActive: false }],
  ]);
  orders = [
    {
      id: "order-open",
      tableId: "1",
      status: "UNCLAIMED",
      createdAt: new Date("2026-01-01T10:00:00.000Z"),
      claimedAt: null,
      completedAt: null,
      claimedById: null,
      items: orderItems("order-open"),
    },
    {
      id: "order-claimed",
      tableId: "1",
      status: "CLAIMED",
      createdAt: new Date("2026-01-01T09:00:00.000Z"),
      claimedAt: new Date("2026-01-01T09:05:00.000Z"),
      completedAt: null,
      claimedById: 1,
      items: orderItems("order-claimed"),
    },
  ];
}

function matchesWhere(order, where = {}) {
  if (where.id !== undefined && order.id !== String(where.id)) return false;
  if (where.status !== undefined && order.status !== where.status) return false;
  if (
    where.claimedById !== undefined &&
    order.claimedById !== where.claimedById
  ) {
    return false;
  }
  return true;
}

function sortOrders(data, orderBy = {}) {
  const [[field, direction] = []] = Object.entries(orderBy);
  if (!field) return data;
  const sign = direction === "asc" ? 1 : -1;

  return [...data].sort((a, b) => {
    const av = a[field] ? new Date(a[field]).getTime() : 0;
    const bv = b[field] ? new Date(b[field]).getTime() : 0;
    return (av - bv) * sign;
  });
}

resetData();

const fakePrisma = {
  table: {
    findUnique: async ({ where }) => tables.get(String(where.id)) || null,
  },
  waiter: {
    findUnique: async ({ where }) => waiters.get(Number(where.id)) || null,
  },
  order: {
    create: async ({ data }) => {
      const id = `order-${++nextOrderId}`;
      const order = {
        id,
        tableId: String(data.tableId),
        status: data.status || "UNCLAIMED",
        createdAt: new Date(),
        claimedAt: null,
        completedAt: null,
        claimedById: null,
        items: (data.items?.create || []).map((item, index) => ({
          id: `${id}-item-${index + 1}`,
          orderId: id,
          ...item,
        })),
      };
      orders.push(order);
      return order;
    },
    findMany: async ({ where, orderBy }) =>
      sortOrders(
        orders.filter((order) => matchesWhere(order, where)),
        orderBy
      ),
    findUnique: async ({ where }) =>
      orders.find((order) => order.id === String(where.id)) || null,
    updateMany: async ({ where, data }) => {
      let count = 0;
      orders = orders.map((order) => {
        if (!matchesWhere(order, where)) return order;
        count += 1;
        return { ...order, ...data };
      });
      return { count };
    },
    delete: async ({ where }) => {
      const index = orders.findIndex((order) => order.id === String(where.id));
      if (index === -1) throw new Error("order not found");
      const [deleted] = orders.splice(index, 1);
      return deleted;
    },
  },
  call: {
    findMany: async () => [],
  },
};

const originalLoad = Module._load;
Module._load = function load(request, parent, isMain) {
  if (request === "@prisma/client") {
    return {
      PrismaClient: function PrismaClient() {
        return fakePrisma;
      },
    };
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

test("anonymous user cannot list unclaimed orders", async () => {
  const res = await request("/orders/unclaimed");

  assert.equal(res.status, 401);
  assert.deepEqual(await res.json(), { error: "staff auth required" });
});

test("anonymous user cannot list claimed orders", async () => {
  const res = await request("/orders/claimed/1");

  assert.equal(res.status, 401);
  assert.deepEqual(await res.json(), { error: "staff auth required" });
});

test("anonymous user cannot claim an order", async () => {
  const res = await request("/orders/order-open/claim", {
    method: "PATCH",
    body: { waiterId: 1 },
  });

  assert.equal(res.status, 401);
  assert.deepEqual(await res.json(), { error: "staff auth required" });
});

test("anonymous user cannot unclaim an order", async () => {
  const res = await request("/orders/order-claimed/unclaim", {
    method: "POST",
    body: { waiterId: 1 },
  });

  assert.equal(res.status, 401);
  assert.deepEqual(await res.json(), { error: "staff auth required" });
});

test("anonymous user cannot complete an order", async () => {
  const res = await request("/orders/order-claimed/complete", {
    method: "POST",
    body: { waiterId: 1 },
  });

  assert.equal(res.status, 401);
  assert.deepEqual(await res.json(), { error: "staff auth required" });
});

test("anonymous user cannot delete an order", async () => {
  const res = await request("/orders/order-claimed", {
    method: "DELETE",
  });

  assert.equal(res.status, 401);
  assert.deepEqual(await res.json(), { error: "staff auth required" });
});

test("authorized waiter can list orders", async () => {
  const unclaimed = await request("/orders/unclaimed", {
    headers: { "X-Waiter-Id": "1" },
  });
  const claimed = await request("/orders/claimed/1", {
    headers: { "X-Waiter-Id": "1" },
  });

  assert.equal(unclaimed.status, 200);
  assert.equal(claimed.status, 200);
  assert.equal((await unclaimed.json())[0].id, "order-open");
  assert.equal((await claimed.json())[0].id, "order-claimed");
});

test("authorized admin can list orders", async () => {
  const res = await request("/orders/unclaimed", {
    headers: { Authorization: adminAuthHeader() },
  });

  assert.equal(res.status, 200);
  assert.equal((await res.json())[0].id, "order-open");
});

test("authorized waiter can claim an order", async () => {
  const res = await request("/orders/order-open/claim", {
    method: "PATCH",
    headers: { "X-Waiter-Id": "1" },
    body: { waiterId: 1 },
  });

  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.id, "order-open");
  assert.equal(body.status, "CLAIMED");
  assert.equal(body.claimedById, 1);
  assert.ok(body.claimedAt);
});

test("authorized waiter can unclaim an order", async () => {
  const res = await request("/orders/order-claimed/unclaim", {
    method: "POST",
    headers: { "X-Waiter-Id": "1" },
    body: { waiterId: 1 },
  });

  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.id, "order-claimed");
  assert.equal(body.status, "UNCLAIMED");
  assert.equal(body.claimedById, null);
  assert.equal(body.claimedAt, null);
});

test("authorized waiter can complete an order", async () => {
  const res = await request("/orders/order-claimed/complete", {
    method: "POST",
    headers: { "X-Waiter-Id": "1" },
    body: { waiterId: 1 },
  });

  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.id, "order-claimed");
  assert.equal(body.status, "COMPLETED");
  assert.ok(body.completedAt);
});

test("waiter cannot manage another waiter's orders", async () => {
  const res = await request("/orders/claimed/1", {
    headers: { "X-Waiter-Id": "2" },
  });

  assert.equal(res.status, 403);
  assert.deepEqual(await res.json(), { error: "staff access forbidden" });
});

test("guest can still create an order with a valid table token", async () => {
  const res = await request("/orders", {
    method: "POST",
    body: {
      tableId: "1",
      token: "table-token",
      items: [{ itemId: "coffee", name: "Coffee", price: 2.5, qty: 1 }],
    },
  });

  assert.equal(res.status, 201);
  const body = await res.json();
  assert.equal(body.tableId, "1");
  assert.equal(body.status, "UNCLAIMED");
  assert.equal(body.items.length, 1);
});
