const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const { PrismaClient } = require("@prisma/client");
const crypto = require("crypto");

require("dotenv").config();

const app = express();
const prisma = new PrismaClient();
const PORT = Number(process.env.PORT || 4000);
const PUBLIC_CLIENT_URL = process.env.PUBLIC_CLIENT_URL || "https://monti.tap2order.ba";
const ADMIN_USER = process.env.ADMIN_USER;
const ADMIN_PASS = process.env.ADMIN_PASS;
const STAFF_PIN = process.env.STAFF_PIN;
const AUTH_SECRET = process.env.AUTH_SECRET;
const ROOM_PENDING_TTL_SECONDS = Number(process.env.ROOM_PENDING_TTL_SECONDS || 5 * 60);
const ROOM_VERIFIED_TTL_SECONDS = Number(process.env.ROOM_VERIFIED_TTL_SECONDS || 60 * 60);
const HOTEL_ORIGIN = new URL(PUBLIC_CLIENT_URL).origin;
const HOTEL_TIMEZONE = process.env.HOTEL_TIMEZONE || "Europe/Sarajevo";
const ROOM_SERVICE_OPENS_AT = process.env.ROOM_SERVICE_OPENS_AT || "07:00";
const ROOM_SERVICE_CLOSES_AT = process.env.ROOM_SERVICE_CLOSES_AT || "23:00";
const ROOM_SERVICE_TEMPORARILY_CLOSED = process.env.ROOM_SERVICE_TEMPORARILY_CLOSED === "true";
const ROOM_SERVICE_MESSAGE = process.env.ROOM_SERVICE_MESSAGE || "";

if (!ADMIN_USER || !ADMIN_PASS || !STAFF_PIN || !AUTH_SECRET) {
  console.error("Missing ADMIN_USER, ADMIN_PASS, STAFF_PIN or AUTH_SECRET environment variables.");
  process.exit(1);
}

const allowedOrigins = [...new Set([
  PUBLIC_CLIENT_URL,
  "http://localhost:5173",
  "https://demo.tap2order.ba",
])];
const AUTH_TTL_SECONDS = 8 * 60 * 60;
const rateBuckets = new Map();

function randomToken(len = 18) {
  return crypto.randomBytes(len).toString("base64url");
}

function safeEqual(left, right) {
  const a = Buffer.from(String(left));
  const b = Buffer.from(String(right));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function signToken(role) {
  const payload = Buffer.from(JSON.stringify({ role, exp: Math.floor(Date.now() / 1000) + AUTH_TTL_SECONDS })).toString("base64url");
  const signature = crypto.createHmac("sha256", AUTH_SECRET).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

function getTokenRole(token) {
  if (!token || typeof token !== "string") return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  const expected = crypto.createHmac("sha256", AUTH_SECRET).update(payload).digest("base64url");
  if (!safeEqual(signature, expected)) return null;
  try {
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (!decoded || !["admin", "staff"].includes(decoded.role) || decoded.exp <= Math.floor(Date.now() / 1000)) return null;
    return decoded.role;
  } catch {
    return null;
  }
}

function cookieValue(req, name) {
  const cookies = String(req.headers.cookie || "").split(";");
  const match = cookies.map((entry) => entry.trim().split("=")).find(([key]) => key === name);
  return match ? decodeURIComponent(match.slice(1).join("=")) : "";
}

async function requireRoomSession(req, res, next) {
  return requireVerifiedRoomSession(req, res, next);
  /* istanbul ignore next */
  try {
    const session = readRoomSession(cookieValue(req, "room_session"));
    if (!session) return res.status(401).json({ code: "ROOM_SESSION_REQUIRED", message: "Ponovo skenirajte QR kod sobe." });
    const table = await prisma.table.findUnique({ where: { id: String(session.roomId) } });
    const currentHash = table && crypto.createHash("sha256").update(table.token).digest("base64url");
    if (!table || !table.isActive || !safeEqual(session.tokenHash, currentHash || "")) {
      return res.status(401).json({ code: "ROOM_SESSION_REVOKED", message: "Sesija sobe više nije važeća." });
    }
    req.table = table;
    next();
  } catch (error) {
    console.error("room session authentication failed", error);
    res.status(500).json({ error: "server error" });
  }
}

const roomCookieName = process.env.NODE_ENV === "production" ? "__Host-room_session" : "room_session";
function roomSessionToken(req) {
  return cookieValue(req, roomCookieName) || cookieValue(req, "room_session");
}
function hashSessionToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}
function setRoomCookie(res, token, ttlSeconds) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  res.setHeader("Set-Cookie", `${roomCookieName}=${encodeURIComponent(token)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${ttlSeconds}${secure}`);
}
async function createRoomSession(roomId, verified) {
  const rawToken = randomToken(32);
  const ttl = verified ? ROOM_VERIFIED_TTL_SECONDS : ROOM_PENDING_TTL_SECONDS;
  const now = new Date();
  await prisma.roomVerificationSession.create({
    data: { tokenHash: hashSessionToken(rawToken), roomId, verifiedAt: verified ? now : null, expiresAt: new Date(now.getTime() + ttl * 1000) },
  });
  return { rawToken, ttl };
}
async function findDbRoomSession(req) {
  const rawToken = roomSessionToken(req);
  if (!rawToken) return null;
  return prisma.roomVerificationSession.findUnique({ where: { tokenHash: hashSessionToken(rawToken) }, include: { room: true } });
}
function parseScannedRoomQr(scannedValue, expectedRoomId) {
  if (typeof scannedValue !== "string" || scannedValue.length > 2048) return null;
  try {
    const url = new URL(scannedValue);
    if (url.origin !== HOTEL_ORIGIN || url.username || url.password || url.pathname !== `/t/${encodeURIComponent(String(expectedRoomId))}` || url.hash) return null;
    if ([...url.searchParams.keys()].some((key) => key !== "token") || url.searchParams.getAll("token").length !== 1) return null;
    const token = url.searchParams.get("token");
    return token ? { roomId: String(expectedRoomId), token } : null;
  } catch {
    return null;
  }
}
async function validateScannedRoomQr(scannedValue, expectedRoomId) {
  const parsed = parseScannedRoomQr(scannedValue, expectedRoomId);
  if (!parsed) return null;
  const room = await prisma.table.findUnique({ where: { id: parsed.roomId } });
  return room && room.isActive && safeEqual(room.token, parsed.token) ? room : null;
}
async function requireVerifiedRoomSession(req, res, next) {
  try {
    const session = await findDbRoomSession(req);
    if (!session) return res.status(401).json({ code: "ROOM_SESSION_REQUIRED", message: "Ponovo skenirajte QR kod sobe." });
    if (session.revokedAt) return res.status(401).json({ code: "ROOM_SESSION_REVOKED", message: "Sesija sobe više nije važeća." });
    if (session.expiresAt <= new Date()) return res.status(401).json({ code: "ROOM_SESSION_EXPIRED", message: "Sesija sobe je istekla." });
    if (!session.verifiedAt) return res.status(403).json({ code: "ROOM_VERIFICATION_REQUIRED", message: "Potvrdite sobu skeniranjem QR koda." });
    if (!session.room?.isActive) return res.status(401).json({ code: "ROOM_SESSION_REVOKED", message: "Sesija sobe više nije važeća." });
    const suppliedRoomId = req.body?.roomId ?? req.query?.roomId ?? req.params?.roomId ?? req.params?.tableId;
    if (suppliedRoomId !== undefined && String(suppliedRoomId) !== String(session.roomId)) {
      return res.status(403).json({ code: "ROOM_SESSION_ROOM_MISMATCH", message: "Sesija ne pripada traženoj sobi." });
    }
    req.room = session.room;
    req.table = session.room;
    req.roomSession = session;
    next();
  } catch (error) {
    console.error("verified room session authentication failed", error);
    res.status(500).json({ error: "server error" });
  }
}

function minutes(value) {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value);
  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
}

function roomServiceAvailability(now = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", {
    timeZone: HOTEL_TIMEZONE, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(now).filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
  const current = Number(parts.hour) * 60 + Number(parts.minute);
  const opens = minutes(ROOM_SERVICE_OPENS_AT);
  const closes = minutes(ROOM_SERVICE_CLOSES_AT);
  const scheduledOpen = opens === closes || (opens < closes ? current >= opens && current < closes : current >= opens || current < closes);
  const isOpen = !ROOM_SERVICE_TEMPORARILY_CLOSED && scheduledOpen;
  const reason = ROOM_SERVICE_TEMPORARILY_CLOSED ? "temporary_closed" : isOpen ? null : "outside_operating_hours";
  return {
    isOpen, reason, timezone: HOTEL_TIMEZONE,
    currentLocalTime: `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}`,
    todayHours: { opensAt: ROOM_SERVICE_OPENS_AT, closesAt: ROOM_SERVICE_CLOSES_AT },
    nextOpenAt: `od ${ROOM_SERVICE_OPENS_AT}`,
    message: ROOM_SERVICE_MESSAGE || (isOpen ? "Room service radi." : "Room service trenutno ne radi."),
  };
}

function bearerRole(req) {
  const header = req.headers.authorization || "";
  return header.startsWith("Bearer ") ? getTokenRole(header.slice(7)) : null;
}

function rateLimit({ windowMs, max, key = "default" }) {
  return (req, res, next) => {
    const now = Date.now();
    const bucketKey = `${key}:${req.ip}`;
    const current = rateBuckets.get(bucketKey);
    const bucket = !current || current.resetAt <= now ? { count: 0, resetAt: now + windowMs } : current;
    bucket.count += 1;
    rateBuckets.set(bucketKey, bucket);
    if (bucket.count > max) {
      res.setHeader("Retry-After", Math.ceil((bucket.resetAt - now) / 1000));
      return res.status(429).json({ error: "Too many requests. Please try again later." });
    }
    next();
  };
}

function requireAdmin(req, res, next) {
  if (bearerRole(req) !== "admin") return res.status(401).json({ error: "admin auth required" });
  req.auth = { role: "admin" };
  next();
}

function requireStaffOrAdminAuth(req, res, next) {
  const role = bearerRole(req);
  if (!role || !["staff", "admin"].includes(role)) return res.status(401).json({ error: "staff auth required" });
  req.auth = { role };
  next();
}

async function requireValidTable(req, res, next) {
  try {
    const tableId = String(req.body.tableId || req.params.tableId || "");
    const token = String(req.body.token || req.query.token || "");
    if (!tableId || !token) return res.status(401).json({ error: "valid table credentials required" });
    const table = await prisma.table.findUnique({ where: { id: tableId } });
    if (!table || !table.isActive || !safeEqual(table.token, token)) return res.status(403).json({ error: "invalid table credentials" });
    req.table = table;
    next();
  } catch (error) {
    console.error("table authentication failed", error);
    res.status(500).json({ error: "server error" });
  }
}

function text(value, { required = false, max = 120 } = {}) {
  if (value === undefined || value === null) return required ? null : undefined;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if ((required && !trimmed) || trimmed.length > max) return null;
  return trimmed;
}

function optionalTranslation(value) {
  const result = text(value, { max: 120 });
  return result === undefined ? undefined : result || null;
}

function parsePrice(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 && number <= 100000 ? number : null;
}

function parseLimit(value, fallback = 100, max = 250) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? Math.min(parsed, max) : fallback;
}

function validIdempotencyKey(value) {
  return typeof value === "string" && /^[A-Za-z0-9_-]{16,128}$/.test(value) ? value : null;
}

function validImageSource(value) {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  if (typeof value !== "string" || value.length > 750 * 1024) return null;
  if (/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/i.test(value)) return value;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

app.set("trust proxy", 1);
app.disable("x-powered-by");
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(self), microphone=(), geolocation=()");
  next();
});
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error("Not allowed by CORS"));
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization", "Idempotency-Key"],
  credentials: true,
}));
app.use(express.json({ limit: "1mb" }));

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: allowedOrigins, methods: ["GET", "POST"], allowedHeaders: ["Authorization"] },
  maxHttpBufferSize: 100_000,
});

io.use((socket, next) => {
  const role = getTokenRole(socket.handshake.auth?.token);
  if (!role || !["staff", "admin"].includes(role)) return next(new Error("unauthorized"));
  socket.data.role = role;
  next();
});
io.on("connection", (socket) => {
  socket.join("staff");
});

app.get("/health", (req, res) => res.json({ status: "ok" }));
app.post("/api/public/rooms/:tableId/bootstrap", rateLimit({ key: "room-bootstrap", windowMs: 60_000, max: 20 }), async (req, res) => {
  try {
    return res.status(410).json({ code: "ROOM_VERIFICATION_REQUIRED", message: "Koristite dvostepenu QR verifikaciju." });
    /* istanbul ignore next */
    const table = await prisma.table.findUnique({ where: { id: String(req.params.tableId) } });
    const token = String(req.body?.token || "");
    if (!table || !table.isActive || !token || !safeEqual(table.token, token)) {
      return res.status(403).json({ code: "INVALID_ROOM_QR", message: "QR kod sobe nije važeći." });
    }
    const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
    res.setHeader("Set-Cookie", `room_session=${encodeURIComponent(signRoomSession(table))}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${ROOM_SESSION_TTL_SECONDS}${secure}`);
    res.json({ room: { id: table.id, displayName: table.name || `Soba ${table.id}` } });
  } catch (error) {
    console.error("room bootstrap failed", error);
    res.status(500).json({ error: "server error" });
  }
});
app.get("/api/public/room-session", (req, res) => res.status(410).json({ code: "ROOM_VERIFICATION_REQUIRED" }));
app.get("/api/public/room-service/availability", requireVerifiedRoomSession, (req, res) => res.json(roomServiceAvailability()));
app.post("/api/guest/room-session/bootstrap", rateLimit({ key: "guest-room-bootstrap", windowMs: 60_000, max: 20 }), async (req, res) => {
  try {
    const roomId = String(req.body?.roomId || "");
    const token = String(req.body?.token || "");
    const room = roomId ? await prisma.table.findUnique({ where: { id: roomId } }) : null;
    if (!room || !room.isActive || !token || !safeEqual(room.token, token)) {
      return res.status(403).json({ code: "INVALID_ROOM_QR", message: "QR kod sobe nije važeći." });
    }
    const existing = await findDbRoomSession(req);
    if (existing && !existing.revokedAt) await prisma.roomVerificationSession.update({ where: { id: existing.id }, data: { revokedAt: new Date() } });
    const created = await createRoomSession(room.id, false);
    setRoomCookie(res, created.rawToken, created.ttl);
    res.status(201).json({ status: "verification_required" });
  } catch (error) {
    console.error("guest room bootstrap failed", error);
    res.status(500).json({ error: "server error" });
  }
});
app.get("/api/guest/room-session", async (req, res) => {
  try {
    const session = await findDbRoomSession(req);
    if (!session) return res.json({ status: "anonymous" });
    if (session.revokedAt || session.expiresAt <= new Date() || !session.room?.isActive) return res.json({ status: "expired", roomId: session.roomId });
    res.json({
      status: session.verifiedAt ? "verified" : "verification_required",
      roomId: session.roomId,
      room: { id: session.room.id, displayName: session.room.name || `Soba ${session.room.id}` },
      expiresAt: session.expiresAt,
    });
  } catch (error) {
    console.error("guest room session status failed", error);
    res.status(500).json({ error: "server error" });
  }
});
app.post("/api/guest/room-session/verify", async (req, res) => {
  try {
    const session = await findDbRoomSession(req);
    if (!session) return res.status(401).json({ code: "ROOM_SESSION_REQUIRED" });
    if (session.revokedAt) return res.status(401).json({ code: "ROOM_SESSION_REVOKED" });
    if (session.expiresAt <= new Date()) return res.status(401).json({ code: "ROOM_SESSION_EXPIRED" });
    if (session.verifiedAt) return res.json({ status: "verified", roomId: session.roomId });
    const room = await validateScannedRoomQr(req.body?.scannedValue, session.roomId);
    if (!room) return res.status(403).json({ code: "INVALID_ROOM_QR", message: "Skenirani QR kod nije važeći." });
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ROOM_VERIFIED_TTL_SECONDS * 1000);
    await prisma.roomVerificationSession.update({ where: { id: session.id }, data: { verifiedAt: now, expiresAt } });
    setRoomCookie(res, roomSessionToken(req), ROOM_VERIFIED_TTL_SECONDS);
    res.json({ status: "verified", roomId: room.id, expiresAt });
  } catch (error) {
    console.error("guest room verification failed", error);
    res.status(500).json({ error: "server error" });
  }
});
app.post("/api/guest/room-session/reverify", async (req, res) => {
  try {
    const roomId = String(req.body?.roomId || "");
    const room = await validateScannedRoomQr(req.body?.scannedValue, roomId);
    if (!room) return res.status(403).json({ code: "INVALID_ROOM_QR", message: "Skenirani QR kod nije važeći." });
    const existing = await findDbRoomSession(req);
    if (existing && !existing.revokedAt) await prisma.roomVerificationSession.update({ where: { id: existing.id }, data: { revokedAt: new Date() } });
    const created = await createRoomSession(room.id, true);
    setRoomCookie(res, created.rawToken, created.ttl);
    res.status(201).json({ status: "verified", roomId: room.id });
  } catch (error) {
    console.error("guest room reverification failed", error);
    res.status(500).json({ error: "server error" });
  }
});
app.post("/auth/admin/login", rateLimit({ key: "admin-login", windowMs: 15 * 60_000, max: 8 }), (req, res) => {
  const username = text(req.body?.username, { required: true, max: 128 });
  const password = text(req.body?.password, { required: true, max: 256 });
  if (!username || !password || !safeEqual(username, ADMIN_USER) || !safeEqual(password, ADMIN_PASS)) return res.status(401).json({ error: "invalid credentials" });
  res.json({ token: signToken("admin"), expiresIn: AUTH_TTL_SECONDS });
});
app.post("/auth/staff/login", rateLimit({ key: "staff-login", windowMs: 15 * 60_000, max: 10 }), (req, res) => {
  const pin = text(req.body?.pin, { required: true, max: 128 });
  if (!pin || !safeEqual(pin, STAFF_PIN)) return res.status(401).json({ error: "invalid credentials" });
  res.json({ token: signToken("staff"), expiresIn: AUTH_TTL_SECONDS });
});

app.get("/menu", async (req, res) => {
  try {
    const menu = await prisma.menuCategory.findMany({ orderBy: { name: "asc" }, include: { items: { orderBy: { name: "asc" } } } });
    res.setHeader("Cache-Control", "public, max-age=60");
    res.json(menu);
  } catch (error) {
    console.error("GET /menu failed", error);
    res.status(500).json({ error: "Failed to load menu" });
  }
});

app.get("/api/public/menu", requireVerifiedRoomSession, async (req, res) => {
  try {
    const menu = await prisma.menuCategory.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: { items: { where: { isActive: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] } },
    });
    res.setHeader("Cache-Control", "public, max-age=60");
    res.json(menu);
  } catch (error) {
    console.error("GET /api/public/menu failed", error);
    res.status(500).json({ error: "Failed to load menu" });
  }
});

app.post("/menu-category", requireAdmin, async (req, res) => {
  try {
    const name = text(req.body?.name, { required: true });
    if (!name) return res.status(400).json({ error: "valid name is required" });
    const created = await prisma.menuCategory.create({ data: { name, name1: optionalTranslation(req.body?.name1) || null, name2: optionalTranslation(req.body?.name2) || null, name3: optionalTranslation(req.body?.name3) || null, name4: optionalTranslation(req.body?.name4) || null } });
    res.status(201).json(created);
  } catch (error) {
    if (error.code === "P2002") return res.status(409).json({ error: "Category already exists" });
    console.error("create category failed", error);
    res.status(500).json({ error: "Failed to create category" });
  }
});
app.put("/menu-category/:id", requireAdmin, async (req, res) => {
  try {
    const data = {};
    if (req.body?.name !== undefined) { const name = text(req.body.name, { required: true }); if (!name) return res.status(400).json({ error: "valid name is required" }); data.name = name; }
    for (const field of ["name1", "name2", "name3", "name4"]) if (req.body?.[field] !== undefined) { const value = optionalTranslation(req.body[field]); if (value === null) return res.status(400).json({ error: `invalid ${field}` }); data[field] = value; }
    res.json(await prisma.menuCategory.update({ where: { id: String(req.params.id) }, data }));
  } catch (error) {
    if (error.code === "P2002") return res.status(409).json({ error: "Category already exists" });
    if (error.code === "P2025") return res.status(404).json({ error: "Category not found" });
    console.error("update category failed", error); res.status(500).json({ error: "Failed to update category" });
  }
});
app.delete("/menu-category/:id", requireAdmin, async (req, res) => {
  try { await prisma.menuCategory.delete({ where: { id: String(req.params.id) } }); res.json({ ok: true }); }
  catch (error) { if (error.code === "P2025") return res.status(404).json({ error: "Category not found" }); console.error("delete category failed", error); res.status(500).json({ error: "Failed to delete category" }); }
});

function menuItemData(body, partial = false) {
  const data = {};
  for (const field of ["name", "name1", "name2", "name3", "name4"]) {
    if (partial && body?.[field] === undefined) continue;
    const value = field === "name" ? text(body?.[field], { required: true }) : optionalTranslation(body?.[field]);
    if (value === null || (field === "name" && !value)) return null;
    data[field] = value;
  }
  if (!partial || body?.price !== undefined) { const price = parsePrice(body?.price); if (!price) return null; data.price = price; }
  if (!partial || body?.imageUrl !== undefined) { const imageUrl = validImageSource(body?.imageUrl); if (imageUrl === null && body?.imageUrl) return null; data.imageUrl = imageUrl || null; }
  return data;
}
app.post("/menu-item", requireAdmin, async (req, res) => {
  try {
    const data = menuItemData(req.body); const categoryId = text(req.body?.categoryId, { required: true, max: 64 });
    if (!data || !categoryId) return res.status(400).json({ error: "invalid menu item" });
    const category = await prisma.menuCategory.findUnique({ where: { id: categoryId } });
    if (!category) return res.status(404).json({ error: "Category not found" });
    res.status(201).json(await prisma.menuItem.create({ data: { ...data, categoryId } }));
  } catch (error) { console.error("create item failed", error); res.status(500).json({ error: "Failed to create item" }); }
});
app.put("/menu-item/:id", requireAdmin, async (req, res) => {
  try {
    const data = menuItemData(req.body, true); if (!data) return res.status(400).json({ error: "invalid menu item" });
    if (req.body?.categoryId !== undefined) { const categoryId = text(req.body.categoryId, { required: true, max: 64 }); if (!categoryId || !(await prisma.menuCategory.findUnique({ where: { id: categoryId } }))) return res.status(400).json({ error: "invalid category" }); data.categoryId = categoryId; }
    res.json(await prisma.menuItem.update({ where: { id: String(req.params.id) }, data }));
  } catch (error) { if (error.code === "P2025") return res.status(404).json({ error: "Item not found" }); console.error("update item failed", error); res.status(500).json({ error: "Failed to update item" }); }
});
app.delete("/menu-item/:id", requireAdmin, async (req, res) => {
  try { await prisma.menuItem.delete({ where: { id: String(req.params.id) } }); res.json({ ok: true }); }
  catch (error) { if (error.code === "P2025") return res.status(404).json({ error: "Item not found" }); console.error("delete item failed", error); res.status(500).json({ error: "Failed to delete item" }); }
});

app.post("/orders", rateLimit({ key: "orders", windowMs: 60_000, max: 12 }), requireVerifiedRoomSession, async (req, res) => {
  try {
    const key = validIdempotencyKey(req.headers["idempotency-key"]);
    const items = req.body?.items;
    if (!key || !Array.isArray(items) || items.length < 1 || items.length > 30) return res.status(400).json({ error: "invalid order" });
    const availability = roomServiceAvailability();
    if (!availability.isOpen) return res.status(409).json({ code: "ROOM_SERVICE_CLOSED", ...availability });
    const requested = new Map();
    for (const item of items) {
      const itemId = text(item?.itemId, { required: true, max: 64 }); const qty = Number(item?.qty); const note = text(item?.note, { max: 500 });
      if (!itemId || !Number.isInteger(qty) || qty < 1 || qty > 20 || note === null) return res.status(400).json({ error: "invalid order item" });
      if (requested.has(itemId)) return res.status(400).json({ error: "duplicate menu item" });
      requested.set(itemId, { qty, note: note || null });
    }
    const existing = await prisma.order.findUnique({ where: { clientRequestId: key }, include: { items: true } });
    if (existing) return res.status(200).json(existing);
    const menuItems = await prisma.menuItem.findMany({ where: { id: { in: [...requested.keys()] }, isActive: true, isAvailable: true }, select: { id: true, name: true, price: true, currency: true } });
    if (menuItems.length !== requested.size) return res.status(400).json({ error: "one or more menu items are unavailable" });
    const currency = menuItems[0]?.currency || "BAM";
    if (menuItems.some((item) => (item.currency || "BAM") !== currency)) return res.status(400).json({ error: "mixed currencies are not supported" });
    const subtotal = menuItems.reduce((sum, item) => sum + item.price * requested.get(item.id).qty, 0);
    const order = await prisma.order.create({ data: { tableId: req.table.id, clientRequestId: key, status: "UNCLAIMED", subtotal, currency, items: { create: menuItems.map((item) => ({ itemId: item.id, name: item.name, price: item.price, ...requested.get(item.id) })) } }, include: { items: true } });
    try { io.to("staff").emit("order:new", order); } catch (notificationError) { console.error("order notification failed", notificationError); }
    res.status(201).json(order);
  } catch (error) {
    if (error.code === "P2002") { const order = await prisma.order.findUnique({ where: { clientRequestId: String(req.headers["idempotency-key"]) }, include: { items: true } }); if (order) return res.json(order); }
    console.error("create order failed", error); res.status(500).json({ error: "Unable to create order" });
  }
});
app.get("/orders/unclaimed", requireStaffOrAdminAuth, async (req, res) => {
  try { res.json(await prisma.order.findMany({ where: { status: "UNCLAIMED" }, orderBy: { createdAt: "desc" }, take: parseLimit(req.query.limit), include: { items: true } })); }
  catch (error) { console.error("list unclaimed orders failed", error); res.status(500).json({ error: "server error" }); }
});
app.get("/orders/claimed", requireStaffOrAdminAuth, async (req, res) => {
  try { res.json(await prisma.order.findMany({ where: { status: "CLAIMED" }, orderBy: { claimedAt: "desc" }, take: parseLimit(req.query.limit), include: { items: true } })); }
  catch (error) { console.error("list claimed orders failed", error); res.status(500).json({ error: "server error" }); }
});
async function transitionOrder(req, res, from, data, event) {
  try {
    const orderId = String(req.params.orderId || req.params.id);
    const result = await prisma.order.updateMany({ where: { id: orderId, status: from }, data });
    if (!result.count) return res.status(409).json({ error: "order is no longer available for this action" });
    const order = await prisma.order.findUnique({ where: { id: orderId }, include: { items: true } });
    io.to("staff").emit(event, order);
    res.json(order);
  } catch (error) { console.error("order transition failed", error); res.status(500).json({ error: "server error" }); }
}
app.patch("/orders/:orderId/claim", requireStaffOrAdminAuth, (req, res) => transitionOrder(req, res, "UNCLAIMED", { status: "CLAIMED", claimedAt: new Date(), claimedById: null }, "order:updated"));
app.post("/orders/:id/unclaim", requireStaffOrAdminAuth, (req, res) => transitionOrder(req, res, "CLAIMED", { status: "UNCLAIMED", claimedAt: null, claimedById: null }, "order:updated"));
app.post("/orders/:id/complete", requireStaffOrAdminAuth, (req, res) => transitionOrder(req, res, "CLAIMED", { status: "COMPLETED", completedAt: new Date() }, "order:updated"));
app.delete("/orders/:orderId", requireAdmin, async (req, res) => {
  try { await prisma.order.delete({ where: { id: String(req.params.orderId) } }); io.to("staff").emit("order:deleted", { orderId: String(req.params.orderId) }); res.json({ ok: true }); }
  catch (error) { if (error.code === "P2025") return res.status(404).json({ error: "order not found" }); console.error("delete order failed", error); res.status(500).json({ error: "server error" }); }
});

app.post("/calls", rateLimit({ key: "calls", windowMs: 60_000, max: 8 }), requireVerifiedRoomSession, async (req, res) => {
  try {
    const type = ["waiter", "bill"].includes(req.body?.type) ? req.body.type : null;
    if (!type) return res.status(400).json({ error: "invalid call type" });
    const call = await prisma.call.create({ data: { tableId: req.table.id, type, status: "OPEN" } });
    io.to("staff").emit("call:new", call); res.status(201).json(call);
  } catch (error) { console.error("create call failed", error); res.status(500).json({ error: "Unable to create call" }); }
});
app.get("/tables/:tableId", requireValidTable, (req, res) => res.json({ id: req.table.id, name: req.table.name }));
app.get("/calls/open", requireStaffOrAdminAuth, async (req, res) => {
  try { res.json(await prisma.call.findMany({ where: { status: "OPEN" }, orderBy: { createdAt: "desc" }, take: parseLimit(req.query.limit) })); }
  catch (error) { console.error("list calls failed", error); res.status(500).json({ error: "server error" }); }
});
app.patch("/calls/:callId/handle", requireStaffOrAdminAuth, async (req, res) => {
  try {
    const result = await prisma.call.updateMany({ where: { id: String(req.params.callId), status: "OPEN" }, data: { status: "HANDLED", handledAt: new Date(), handledById: null } });
    if (!result.count) return res.status(409).json({ error: "call is no longer open" });
    const call = await prisma.call.findUnique({ where: { id: String(req.params.callId) } });
    io.to("staff").emit("call:handled", { callId: call.id }); res.json(call);
  } catch (error) { console.error("handle call failed", error); res.status(500).json({ error: "server error" }); }
});

app.use("/api/admin", requireAdmin);
app.get("/api/admin/tables", async (req, res) => {
  try { res.json(await prisma.table.findMany({ orderBy: { createdAt: "asc" }, select: { id: true, name: true, token: true, isActive: true, createdAt: true } })); }
  catch (error) { console.error("list tables failed", error); res.status(500).json({ error: "Unable to load tables" }); }
});
app.get("/api/admin/orders", async (req, res) => {
  try { res.json(await prisma.order.findMany({ orderBy: { createdAt: "desc" }, take: parseLimit(req.query.limit, 250, 500), include: { items: true, claimedBy: { select: { id: true, name: true } } } })); }
  catch (error) { console.error("list admin orders failed", error); res.status(500).json({ error: "Unable to load orders" }); }
});
app.post("/api/admin/tables", async (req, res) => {
  try {
    const id = text(req.body?.id, { required: true, max: 64 }); const name = text(req.body?.name, { max: 120 });
    if (!id || !/^[A-Za-z0-9_-]+$/.test(id) || name === null) return res.status(400).json({ error: "invalid table" });
    res.status(201).json(await prisma.table.create({ data: { id, name: name || null, token: randomToken(), isActive: true }, select: { id: true, name: true, token: true, isActive: true, createdAt: true } }));
  } catch (error) { if (error.code === "P2002") return res.status(409).json({ error: "table already exists" }); console.error("create table failed", error); res.status(500).json({ error: "Unable to create table" }); }
});
app.put("/api/admin/tables/:tableId", async (req, res) => {
  try {
    const data = {}; if (req.body?.name !== undefined) { const name = text(req.body.name, { max: 120 }); if (name === null) return res.status(400).json({ error: "invalid name" }); data.name = name || null; } if (req.body?.isActive !== undefined && typeof req.body.isActive !== "boolean") return res.status(400).json({ error: "invalid isActive" }); if (req.body?.isActive !== undefined) data.isActive = req.body.isActive;
    res.json(await prisma.table.update({ where: { id: String(req.params.tableId) }, data, select: { id: true, name: true, token: true, isActive: true, createdAt: true } }));
  } catch (error) { if (error.code === "P2025") return res.status(404).json({ error: "table not found" }); console.error("update table failed", error); res.status(500).json({ error: "Unable to update table" }); }
});
app.delete("/api/admin/tables/:tableId", async (req, res) => {
  try { await prisma.table.delete({ where: { id: String(req.params.tableId) } }); res.json({ ok: true }); }
  catch (error) { if (error.code === "P2025") return res.status(404).json({ error: "table not found" }); console.error("delete table failed", error); res.status(500).json({ error: "Unable to delete table" }); }
});
app.post("/api/admin/tables/:tableId/rotate-token", async (req, res) => {
  try {
    const roomId = String(req.params.tableId);
    const table = await prisma.table.update({ where: { id: roomId }, data: { token: randomToken() }, select: { id: true, name: true, token: true, isActive: true, createdAt: true } });
    await prisma.roomVerificationSession.updateMany({ where: { roomId, revokedAt: null }, data: { revokedAt: new Date() } });
    res.json({ ok: true, table });
  }
  catch (error) { if (error.code === "P2025") return res.status(404).json({ error: "table not found" }); console.error("rotate token failed", error); res.status(500).json({ error: "Unable to rotate token" }); }
});
app.get("/api/admin/tables/:tableId/scan-url", async (req, res) => {
  try { const table = await prisma.table.findUnique({ where: { id: String(req.params.tableId) }, select: { id: true, token: true, isActive: true } }); if (!table || !table.isActive) return res.status(404).json({ error: "table not found" }); res.json({ url: `${PUBLIC_CLIENT_URL}/t/${table.id}?token=${encodeURIComponent(table.token)}` }); }
  catch (error) { console.error("scan URL failed", error); res.status(500).json({ error: "Unable to create scan URL" }); }
});
app.get("/api/admin/tables/:tableId/orders", async (req, res) => {
  try { const tableId = String(req.params.tableId); const table = await prisma.table.findUnique({ where: { id: tableId }, select: { id: true } }); if (!table) return res.status(404).json({ error: "table not found" }); res.json(await prisma.order.findMany({ where: { tableId }, orderBy: { createdAt: "desc" }, take: parseLimit(req.query.limit, 50, 100), include: { items: true } })); }
  catch (error) { console.error("table orders failed", error); res.status(500).json({ error: "Unable to load orders" }); }
});

app.use((error, req, res, next) => {
  console.error("Unhandled request error", error);
  if (res.headersSent) return next(error);
  res.status(500).json({ error: "server error" });
});

if (require.main === module) server.listen(PORT, "127.0.0.1", () => console.log(`Server running on port ${PORT}`));
module.exports = { app, server, io, prisma, requireAdmin, requireValidTable, requireVerifiedRoomSession, requireStaffOrAdminAuth, getTokenRole };
