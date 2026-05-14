const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const { PrismaClient } = require("@prisma/client");
const crypto = require("crypto");

require("dotenv").config();

const app = express();
const prisma = new PrismaClient();

const PUBLIC_CLIENT_URL = process.env.PUBLIC_CLIENT_URL || "https://demo.tap2order.ba";

const ADMIN_USER = process.env.ADMIN_USER;
const ADMIN_PASS = process.env.ADMIN_PASS;

if (!ADMIN_USER || !ADMIN_PASS) {
  console.error("Missing required ADMIN_USER or ADMIN_PASS environment variables.");
  process.exit(1);
}

const allowedOrigins = [
  PUBLIC_CLIENT_URL,
  "http://localhost:5173",
  "http://demo.tap2order.ba",
  "https://demo.tap2order.ba",
];

/* ---------- Helpers ---------- */
function randomToken(len = 18) {
  return crypto.randomBytes(len).toString("base64url");
}

/* ---------- Middleware ---------- */
app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);

app.use(express.json());




async function requireValidTable(req, res, next) {
  try {
    const tableId = String(req.body.tableId || req.params.tableId || "");
    const token = String(req.body.token || req.query.token || "");

    if (!tableId) return res.status(400).json({ error: "tableId is required" });
    if (!token) return res.status(401).json({ error: "token is required" });

    const table = await prisma.table.findUnique({ where: { id: tableId } });
    if (!table || !table.isActive) return res.status(404).json({ error: "table not found" });
    if (table.token !== token) return res.status(403).json({ error: "invalid token" });

    req.table = table;
    next();
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "server error" });
  }
}

function requireAdmin(req, res, next) {
  const user = ADMIN_USER;
  const pass = ADMIN_PASS;

  const h = req.headers.authorization || "";
  if (!h.startsWith("Basic ")) {
    res.setHeader("WWW-Authenticate", 'Basic realm="Admin"');
    return res.status(401).json({ error: "admin auth required" });
  }

  const base64 = h.slice("Basic ".length);
  let decoded = "";
  try {
    decoded = Buffer.from(base64, "base64").toString("utf8");
  } catch {
    return res.status(401).json({ error: "invalid auth" });
  }

  const [u, p] = decoded.split(":");
  if (u !== user || p !== pass) {
    res.setHeader("WWW-Authenticate", 'Basic realm="Admin"');
    return res.status(401).json({ error: "invalid admin credentials" });
  }

  next();
}

function getRequestWaiterId(req) {
  const value = req.headers["x-waiter-id"];
  const waiterId = Number(value);
  return Number.isInteger(waiterId) ? waiterId : null;
}

async function requireStaffOrAdminAuth(req, res, next) {
  const h = req.headers.authorization || "";

  if (h.startsWith("Basic ")) {
    const base64 = h.slice("Basic ".length);
    let decoded = "";
    try {
      decoded = Buffer.from(base64, "base64").toString("utf8");
    } catch {
      return res.status(401).json({ error: "invalid auth" });
    }

    const [u, p] = decoded.split(":");
    if (u === ADMIN_USER && p === ADMIN_PASS) {
      req.staffAuth = { type: "admin" };
      return next();
    }

    return res.status(401).json({ error: "invalid admin credentials" });
  }

  const waiterId = getRequestWaiterId(req);
  if (!waiterId) {
    return res.status(401).json({ error: "staff auth required" });
  }

  try {
    const waiter = await prisma.waiter.findUnique({
      where: { id: waiterId },
      select: { id: true, isActive: true },
    });

    if (!waiter || !waiter.isActive) {
      return res.status(403).json({ error: "staff access forbidden" });
    }

    req.staffAuth = { type: "waiter", waiterId };
    next();
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "server error" });
  }
}

function requireCallManagerAuth(req, res, next) {
  requireStaffOrAdminAuth(req, res, () => {
    req.callManager = req.staffAuth;
    next();
  });
}

function requireMatchingWaiterOrAdmin(req, res, waiterId) {
  if (req.staffAuth?.type === "waiter" && req.staffAuth.waiterId !== waiterId) {
    res.status(403).json({ error: "staff access forbidden" });
    return false;
  }

  return true;
}

/* ---------- HTTP server + Socket.IO ---------- */
const PORT = process.env.PORT || 4000;
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST", "PATCH", "DELETE"],
    credentials: true,
  },
});

io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);
  socket.on("disconnect", () => console.log("Socket disconnected:", socket.id));
});

/* ---------- Health + Menu (DB) ---------- */
app.get("/health", (req, res) => res.json({ status: "ok" }));

app.get("/menu", async (req, res) => {
  try {
    const menu = await prisma.menuCategory.findMany({
      orderBy: { name: "asc" },
      include: { items: { orderBy: { name: "asc" } } },
    });
    res.json(menu);
  } catch (e) {
    console.error("GET /menu failed:", e);
    res.status(500).json({ error: "Failed to load menu" });
  }
});

// ✅ Create Menu Category
app.post("/menu-category", requireAdmin, async (req, res) => {
  try {
    const name = String(req.body?.name || "").trim();
    const name1 = req.body?.name1 !== undefined ? String(req.body.name1).trim() : null;
    const name2 = req.body?.name2 !== undefined ? String(req.body.name2).trim() : null;
    const name3 = req.body?.name3 !== undefined ? String(req.body.name3).trim() : null;
    const name4 = req.body?.name4 !== undefined ? String(req.body.name4).trim() : null;

    if (!name) return res.status(400).json({ error: "Name is required" });

    const created = await prisma.menuCategory.create({
      data: {
        name,
        name1: name1 || null,
        name2: name2 || null,
        name3: name3 || null,
        name4: name4 || null,
      },
    });

    res.status(201).json(created);
  } catch (e) {
    if (e.code === "P2002") {
      return res.status(409).json({ error: "Category already exists" });
    }
    console.error("POST /menu-category failed:", e);
    res.status(500).json({ error: "Failed to create category" });
  }
});

app.put("/menu-category/:id", requireAdmin, async (req, res) => {
  try {
    const id = String(req.params.id);

    const name = req.body?.name !== undefined ? String(req.body.name).trim() : undefined;
    const name1 = req.body?.name1 !== undefined ? String(req.body.name1).trim() : undefined;
    const name2 = req.body?.name2 !== undefined ? String(req.body.name2).trim() : undefined;
    const name3 = req.body?.name3 !== undefined ? String(req.body.name3).trim() : undefined;
    const name4 = req.body?.name4 !== undefined ? String(req.body.name4).trim() : undefined;

    const data = {};

    if (name !== undefined) {
      if (!name) return res.status(400).json({ error: "Name cannot be empty" });
      data.name = name;
    }

    if (name1 !== undefined) data.name1 = name1 || null;
    if (name2 !== undefined) data.name2 = name2 || null;
    if (name3 !== undefined) data.name3 = name3 || null;
    if (name4 !== undefined) data.name4 = name4 || null;

    const updated = await prisma.menuCategory.update({
      where: { id },
      data,
    });

    res.json(updated);
  } catch (e) {
    if (e.code === "P2002") return res.status(409).json({ error: "Category name already exists" });
    if (e.code === "P2025") return res.status(404).json({ error: "Category not found" });

    console.error("PUT /menu-category/:id failed:", e);
    res.status(500).json({ error: "Failed to update category" });
  }
});

app.delete("/menu-category/:id", requireAdmin, async (req, res) => {
  try {
    const id = String(req.params.id);

    await prisma.menuCategory.delete({ where: { id } });

    res.json({ ok: true });
  } catch (e) {
    if (e.code === "P2025") return res.status(404).json({ error: "Category not found" });

    console.error("DELETE /menu-category/:id failed:", e);
    res.status(500).json({ error: "Failed to delete category" });
  }
});

// ✅ Create Menu Item
app.post("/menu-item", requireAdmin, async (req, res) => {
  try {
    const name = String(req.body?.name || "").trim();
    const name1 = req.body?.name1 !== undefined ? String(req.body.name1).trim() : null;
    const name2 = req.body?.name2 !== undefined ? String(req.body.name2).trim() : null;
    const name3 = req.body?.name3 !== undefined ? String(req.body.name3).trim() : null;
    const name4 = req.body?.name4 !== undefined ? String(req.body.name4).trim() : null;
    const imageUrl = req.body?.imageUrl !== undefined ? String(req.body.imageUrl).trim() : null;

    const categoryId = String(req.body?.categoryId || "").trim();
    const priceRaw = req.body?.price;

    const price = Number(priceRaw);

    if (!name) return res.status(400).json({ error: "Name is required" });
    if (!categoryId) return res.status(400).json({ error: "categoryId is required" });
    if (!Number.isFinite(price) || price <= 0) {
      return res.status(400).json({ error: "Price must be a number > 0" });
    }

    const cat = await prisma.menuCategory.findUnique({ where: { id: categoryId } });
    if (!cat) return res.status(404).json({ error: "Category not found" });

    const created = await prisma.menuItem.create({
      data: {
        name,
        name1,
        name2,
        name3,
        name4,
        imageUrl,
        price,
        categoryId,
      },
    });

    res.status(201).json(created);
  } catch (e) {
    console.error("POST /menu-item failed:", e);
    res.status(500).json({ error: "Failed to create item" });
  }
});

// ✅ Update Menu Item
// ✅ Update Menu Item
app.put("/menu-item/:id", requireAdmin, async (req, res) => {
  try {
    const id = String(req.params.id);

    const name = req.body?.name !== undefined ? String(req.body.name).trim() : undefined;
    const name1 = req.body?.name1 !== undefined ? String(req.body.name1).trim() : undefined;
    const name2 = req.body?.name2 !== undefined ? String(req.body.name2).trim() : undefined;
    const name3 = req.body?.name3 !== undefined ? String(req.body.name3).trim() : undefined;
    const name4 = req.body?.name4 !== undefined ? String(req.body.name4).trim() : undefined;
    const imageUrl = req.body?.imageUrl !== undefined ? String(req.body.imageUrl).trim() : undefined;

    const price = req.body?.price !== undefined ? Number(req.body.price) : undefined;
    const categoryId =
      req.body?.categoryId !== undefined ? String(req.body.categoryId).trim() : undefined;

    const data = {};

    if (name !== undefined) {
      if (!name) return res.status(400).json({ error: "Name cannot be empty" });
      data.name = name;
    }

    if (name1 !== undefined) data.name1 = name1 || null;
    if (name2 !== undefined) data.name2 = name2 || null;
    if (name3 !== undefined) data.name3 = name3 || null;
    if (name4 !== undefined) data.name4 = name4 || null;
    if (imageUrl !== undefined) data.imageUrl = imageUrl || null;

    if (price !== undefined) {
      if (!Number.isFinite(price) || price <= 0) {
        return res.status(400).json({ error: "Price must be a number > 0" });
      }
      data.price = price;
    }

    if (categoryId !== undefined) {
      if (!categoryId) return res.status(400).json({ error: "categoryId cannot be empty" });
      const cat = await prisma.menuCategory.findUnique({ where: { id: categoryId } });
      if (!cat) return res.status(404).json({ error: "Category not found" });
      data.categoryId = categoryId;
    }

    const updated = await prisma.menuItem.update({
      where: { id },
      data,
    });

    res.json(updated);
  } catch (e) {
    if (e.code === "P2025") return res.status(404).json({ error: "Item not found" });

    console.error("PUT /menu-item/:id failed:", e);
    res.status(500).json({ error: "Failed to update item" });
  }
});

// ✅ Delete Menu Item
app.delete("/menu-item/:id", requireAdmin, async (req, res) => {
  try {
    const id = String(req.params.id);

    await prisma.menuItem.delete({ where: { id } });

    res.json({ ok: true });
  } catch (e) {
    if (e.code === "P2025") return res.status(404).json({ error: "Item not found" });

    console.error("DELETE /menu-item/:id failed:", e);
    res.status(500).json({ error: "Failed to delete item" });
  }
});

/* =========================
   ORDERS (Prisma)
========================= */

app.post("/orders", requireValidTable, async (req, res) => {
  try {
    const { tableId, items } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "items must be a non-empty array" });
    }

    const order = await prisma.order.create({
      data: {
        tableId: String(tableId),
        status: "UNCLAIMED",
        items: {
          create: items.map((it) => ({
            itemId: String(it.itemId),
            name: String(it.name),
            price: Number(it.price),
            qty: Number(it.qty),
            note: it.note ? String(it.note) : null,
          })),
        },
      },
      include: { items: true },
    });

    io.emit("order:new", order);
    res.status(201).json(order);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "server error" });
  }
});

app.get("/orders/unclaimed", requireStaffOrAdminAuth, async (req, res) => {
  try {
    const data = await prisma.order.findMany({
      where: { status: "UNCLAIMED" },
      orderBy: { createdAt: "desc" },
      include: { items: true },
    });

    res.json(data);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "server error" });
  }
});

app.patch("/orders/:orderId/claim", requireStaffOrAdminAuth, async (req, res) => {
  try {
    const { orderId } = req.params;
    const waiterId = Number(req.body.waiterId);

    if (!Number.isInteger(waiterId)) {
      return res.status(400).json({ error: "valid waiterId is required" });
    }

    if (!requireMatchingWaiterOrAdmin(req, res, waiterId)) return;

    const result = await prisma.order.updateMany({
      where: { id: String(orderId), status: "UNCLAIMED" },
      data: {
        status: "CLAIMED",
        claimedById: waiterId,
        claimedAt: new Date(),
      },
    });

    if (result.count === 0) {
      const exists = await prisma.order.findUnique({ where: { id: String(orderId) } });
      if (!exists) return res.status(404).json({ error: "order not found" });
      return res.status(409).json({ error: "order already claimed" });
    }

    const updated = await prisma.order.findUnique({
      where: { id: String(orderId) },
      include: { items: true },
    });

    io.emit("order:claimed", { orderId: String(orderId), waiterId });
    res.json(updated);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "server error" });
  }
});

app.post("/orders/:id/unclaim", requireStaffOrAdminAuth, async (req, res) => {
  try {
    const orderId = String(req.params.id);
    const waiterId = Number(req.body.waiterId);

    if (!Number.isInteger(waiterId)) {
      return res.status(400).json({ error: "valid waiterId is required" });
    }

    if (!requireMatchingWaiterOrAdmin(req, res, waiterId)) return;

    const result = await prisma.order.updateMany({
      where: {
        id: orderId,
        status: "CLAIMED",
        claimedById: waiterId,
      },
      data: {
        status: "UNCLAIMED",
        claimedById: null,
        claimedAt: null,
      },
    });

    if (result.count === 0) {
      const order = await prisma.order.findUnique({ where: { id: orderId } });
      if (!order) return res.status(404).json({ error: "order not found" });
      if (order.status !== "CLAIMED") return res.status(409).json({ error: "order is not claimed" });
      return res.status(403).json({ error: "not your order" });
    }

    const updated = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    io.emit("order:updated", updated);
    res.json(updated);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "server error" });
  }
});

app.get("/orders/claimed/:waiterId", requireStaffOrAdminAuth, async (req, res) => {
  try {
    const waiterId = Number(req.params.waiterId);
    if (!Number.isInteger(waiterId)) {
      return res.status(400).json({ error: "valid waiterId is required" });
    }

    if (!requireMatchingWaiterOrAdmin(req, res, waiterId)) return;

    const data = await prisma.order.findMany({
      where: { status: "CLAIMED", claimedById: waiterId },
      orderBy: { claimedAt: "desc" },
      include: { items: true },
    });

    res.json(data);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "server error" });
  }
});

app.delete("/orders/:orderId", requireStaffOrAdminAuth, async (req, res) => {
  try {
    const orderId = String(req.params.orderId);

    const existing = await prisma.order.findUnique({ where: { id: orderId } });
    if (!existing) {
      return res.json({ success: true, orderId, alreadyDeleted: true });
    }

    if (
      req.staffAuth?.type === "waiter" &&
      existing.claimedById !== req.staffAuth.waiterId
    ) {
      return res.status(403).json({ error: "not your order" });
    }

    await prisma.order.delete({ where: { id: orderId } });
    io.emit("order:deleted", { orderId });

    res.json({ success: true, orderId });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "server error" });
  }
});

app.post("/orders/:id/complete", requireStaffOrAdminAuth, async (req, res) => {
  try {
    const orderId = String(req.params.id);
    const waiterId = Number(req.body.waiterId);

    if (!Number.isInteger(waiterId)) {
      return res.status(400).json({ error: "valid waiterId is required" });
    }

    if (!requireMatchingWaiterOrAdmin(req, res, waiterId)) return;

    const result = await prisma.order.updateMany({
      where: {
        id: orderId,
        status: "CLAIMED",
        claimedById: waiterId,
      },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
      },
    });

    if (result.count === 0) {
      const order = await prisma.order.findUnique({ where: { id: orderId } });
      if (!order) return res.status(404).json({ error: "order not found" });
      if (order.status !== "CLAIMED") {
        return res.status(409).json({ error: "order is not claimed" });
      }
      return res.status(403).json({ error: "not your order" });
    }

    const updated = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    io.emit("order:updated", updated);
    res.json(updated);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "server error" });
  }
});

/* =========================
   CALLS (Prisma)
========================= */

app.post("/calls", requireValidTable, async (req, res) => {
  try {
    const { tableId, type } = req.body;

    const call = await prisma.call.create({
      data: {
        tableId: String(tableId),
        type: type || "waiter",
        status: "OPEN",
      },
    });

    io.emit("call:new", call);
    res.status(201).json(call);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "server error" });
  }
});

app.get("/tables/:tableId", async (req, res) => {
  try {
    const { tableId } = req.params;
    const token = String(req.query.token || "");

    const table = await prisma.table.findUnique({ where: { id: String(tableId) } });
    if (!table || !table.isActive) return res.status(404).json({ error: "table not found" });
    if (!token || table.token !== token) return res.status(403).json({ error: "invalid token" });

    res.json({ id: table.id, name: table.name });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "server error" });
  }
});

app.get("/calls/open", requireCallManagerAuth, async (req, res) => {
  try {
    const data = await prisma.call.findMany({
      where: { status: "OPEN" },
      orderBy: { createdAt: "desc" },
    });
    res.json(data);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "server error" });
  }
});

app.patch("/calls/:callId/handle", requireCallManagerAuth, async (req, res) => {
  try {
    const { callId } = req.params;
    const waiterId = Number(req.body.waiterId);

    if (!Number.isInteger(waiterId)) {
      return res.status(400).json({ error: "valid waiterId is required" });
    }

    if (req.callManager?.type === "waiter" && req.callManager.waiterId !== waiterId) {
      return res.status(403).json({ error: "staff access forbidden" });
    }

    const call = await prisma.call.findUnique({ where: { id: callId } });
    if (!call) return res.status(404).json({ error: "call not found" });
    if (call.status !== "OPEN") return res.status(409).json({ error: "already handled" });

    const updated = await prisma.call.update({
      where: { id: callId },
      data: {
        status: "HANDLED",
        handledById: waiterId,
        handledAt: new Date(),
      },
    });

    io.emit("call:handled", { callId: updated.id, waiterId });
    res.json(updated);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "server error" });
  }
});

/* =========================
   WAITERS (Public)
========================= */

app.get("/waiters", async (req, res) => {
  try {
    const waiters = await prisma.waiter.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    });

    res.json(waiters);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "server error" });
  }
});

app.get("/waiters/:waiterId", async (req, res) => {
  try {
    const id = Number(req.params.waiterId);
    if (!Number.isInteger(id)) return res.status(400).json({ error: "invalid waiter id" });

    const w = await prisma.waiter.findUnique({
      where: { id },
      select: { id: true, name: true, isActive: true, createdAt: true },
    });

    if (!w) return res.status(404).json({ error: "waiter not found" });
    res.json(w);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "server error" });
  }
});

/* =========================
   ADMIN: TABLES (CRUD)
========================= */
app.use("/api/admin", requireAdmin);

app.get("/api/admin/tables", async (req, res) => {
  try {
    const tables = await prisma.table.findMany({
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, token: true, isActive: true, createdAt: true },
    });
    res.json(tables);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/admin/orders", async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        items: true,
        claimedBy: {
          select: { id: true, name: true },
        },
      },
    });

    res.json(orders);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "server error" });
  }
});

app.post("/api/admin/tables", async (req, res) => {
  try {
    const { id, name } = req.body;

    if (!id || typeof id !== "string") {
      return res.status(400).json({ error: "id (string) is required, e.g. 't1' or '1'" });
    }

    const created = await prisma.table.create({
      data: {
        id: String(id),
        name: name ? String(name) : null,
        token: randomToken(),
        isActive: true,
      },
      select: { id: true, name: true, token: true, isActive: true, createdAt: true },
    });

    res.status(201).json(created);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

app.put("/api/admin/tables/:tableId", async (req, res) => {
  try {
    const tableId = String(req.params.tableId);
    const { name, isActive } = req.body;

    const data = {};
    if (name !== undefined) data.name = name ? String(name) : null;
    if (isActive !== undefined) data.isActive = !!isActive;

    const updated = await prisma.table.update({
      where: { id: tableId },
      data,
      select: { id: true, name: true, token: true, isActive: true, createdAt: true },
    });

    res.json(updated);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

app.delete("/api/admin/tables/:tableId", async (req, res) => {
  try {
    const tableId = String(req.params.tableId);
    await prisma.table.delete({ where: { id: tableId } });
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/admin/tables/:tableId/rotate-token", async (req, res) => {
  try {
    const tableId = String(req.params.tableId);

    const updated = await prisma.table.update({
      where: { id: tableId },
      data: { token: randomToken() },
      select: { id: true, name: true, token: true, isActive: true, createdAt: true },
    });

    res.json({ ok: true, table: updated });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/admin/tables/:tableId/scan-url", async (req, res) => {
  try {
    const tableId = String(req.params.tableId);

    const table = await prisma.table.findUnique({
      where: { id: tableId },
      select: { id: true, token: true, isActive: true },
    });

    if (!table || !table.isActive) return res.status(404).json({ error: "table not found" });

    const base = PUBLIC_CLIENT_URL;
    const url = `${base}/t/${table.id}?token=${encodeURIComponent(table.token)}`;

    res.json({ url, tableId: table.id, token: table.token });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "server error" });
  }
});

/* =========================
   ADMIN: WAITERS (CRUD) - NO PIN
========================= */
app.get("/api/admin/waiters", async (req, res) => {
  try {
    const waiters = await prisma.waiter.findMany({
      orderBy: { id: "asc" },
      select: { id: true, name: true, isActive: true, createdAt: true },
    });
    res.json(waiters);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "server error" });
  }
});

app.post("/api/admin/waiters", async (req, res) => {
  try {
    const { name } = req.body;

    if (!name || typeof name !== "string") {
      return res.status(400).json({ error: "name is required" });
    }

    const created = await prisma.waiter.create({
      data: {
        name: String(name),
        isActive: true,
      },
      select: { id: true, name: true, isActive: true, createdAt: true },
    });

    res.status(201).json(created);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

app.put("/api/admin/waiters/:waiterId", async (req, res) => {
  try {
    const waiterId = Number(req.params.waiterId);
    if (!Number.isInteger(waiterId)) return res.status(400).json({ error: "invalid waiter id" });

    const { name, isActive } = req.body;

    const data = {};
    if (name !== undefined) data.name = String(name);
    if (isActive !== undefined) data.isActive = !!isActive;

    const updated = await prisma.waiter.update({
      where: { id: waiterId },
      data,
      select: { id: true, name: true, isActive: true, createdAt: true },
    });

    res.json(updated);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

app.delete("/api/admin/waiters/:waiterId", async (req, res) => {
  try {
    const waiterId = Number(req.params.waiterId);
    if (!Number.isInteger(waiterId)) return res.status(400).json({ error: "invalid waiter id" });

    await prisma.waiter.delete({ where: { id: waiterId } });
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/admin/tables/:tableId/orders", async (req, res) => {
  try {
    const tableId = String(req.params.tableId);

    const table = await prisma.table.findUnique({
      where: { id: tableId },
      select: { id: true },
    });

    if (!table) return res.status(404).json({ error: "table not found" });

    const orders = await prisma.order.findMany({
      where: { tableId },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { items: true },
    });

    res.json(orders);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "server error" });
  }
});

/* ---------- Start server ---------- */
if (require.main === module) {
  server.listen(PORT, "127.0.0.1", () => {
    console.log("Server running on port", PORT);
  });
}

module.exports = {
  app,
  server,
  io,
  prisma,
  requireAdmin,
  requireValidTable,
  requireStaffOrAdminAuth,
  requireCallManagerAuth,
};

