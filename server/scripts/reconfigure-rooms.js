const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { PrismaClient, Prisma } = require("@prisma/client");

require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const prisma = new PrismaClient();
const EXPECTED_ACTIVE_COUNT = 64;
const ADVISORY_LOCK_KEY = 2026073001;
const ACTIVE_NUMBERS = [
  ...range(102, 124),
  ...range(201, 224),
  ...range(301, 315),
  402,
  410,
];

function range(from, to) {
  return Array.from({ length: to - from + 1 }, (_, index) => from + index);
}

function usage() {
  console.log(`Usage:
  node scripts/reconfigure-rooms.js --check
  node scripts/reconfigure-rooms.js --apply
  node scripts/reconfigure-rooms.js --rollback <backup-file>

--check is read-only and is the default. --apply writes a JSON backup before
updating rows in one transaction. --rollback restores name/isActive only.`);
}

function naturalCompare(left, right) {
  return String(left).localeCompare(String(right), undefined, {
    numeric: true,
    sensitivity: "base",
  });
}

function currentRoomNumber(row) {
  const candidates = [row.name, row.id];
  for (const value of candidates) {
    const match = String(value || "").trim().match(/^(?:soba|room|table)?\s*[-_ ]?\s*(\d+)$/i);
    if (match) return Number(match[1]);
  }
  return null;
}

function stableRows(rows) {
  return [...rows].sort(
    (a, b) =>
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime() ||
      naturalCompare(a.id, b.id),
  );
}

function buildPlan(rows) {
  if (ACTIVE_NUMBERS.length !== EXPECTED_ACTIVE_COUNT) {
    throw new Error(`Greška u skripti: lista nema ${EXPECTED_ACTIVE_COUNT} brojeva.`);
  }
  if (rows.length < EXPECTED_ACTIVE_COUNT) {
    throw new Error(
      `Baza ima ${rows.length} soba, a potrebno je najmanje ${EXPECTED_ACTIVE_COUNT}. ` +
        "Skripta neće kreirati niti prenamijeniti nepostojeće zapise.",
    );
  }

  const ordered = stableRows(rows);
  const available = new Set(ordered.map((row) => row.id));
  const assigned = new Map();

  // Keep already-correct room numbers on their existing records where possible.
  for (const number of ACTIVE_NUMBERS) {
    const matches = ordered.filter(
      (row) => available.has(row.id) && currentRoomNumber(row) === number,
    );
    if (matches.length === 1) {
      assigned.set(matches[0].id, number);
      available.delete(matches[0].id);
    }
  }

  const unassignedNumbers = ACTIVE_NUMBERS.filter(
    (number) => ![...assigned.values()].includes(number),
  );
  const candidates = ordered
    .filter((row) => available.has(row.id))
    .sort(
      (a, b) =>
        Number(b.isActive) - Number(a.isActive) ||
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime() ||
        naturalCompare(a.id, b.id),
    );

  unassignedNumbers.forEach((number, index) => assigned.set(candidates[index].id, number));

  let reserveNumber = 0;
  return ordered.map((row) => {
    const activeNumber = assigned.get(row.id);
    const isActive = activeNumber !== undefined;
    if (!isActive) reserveNumber += 1;
    return {
      id: row.id,
      oldName: row.name,
      oldIsActive: row.isActive,
      newName: isActive ? `Soba ${activeNumber}` : `Rezervna soba ${reserveNumber}`,
      newIsActive: isActive,
      createdAt: row.createdAt,
    };
  });
}

function printPlan(rows, plan) {
  const changes = plan.filter(
    (row) => row.oldName !== row.newName || row.oldIsActive !== row.newIsActive,
  );
  const active = plan.filter((row) => row.newIsActive);
  const reserves = plan.filter((row) => !row.newIsActive);

  console.log(`Trenutni broj soba: ${rows.length}`);
  console.log(`Trenutno aktivnih: ${rows.filter((row) => row.isActive).length}`);
  console.log(`Planirano aktivnih: ${active.length}`);
  console.log(`Planirano rezervnih: ${reserves.length}`);
  console.log(`Zapisa koji se mijenjaju: ${changes.length}`);
  console.log("\nTAČNO MAPIRANJE AKTIVNIH SOBA:");
  console.table(
    active.map((row) => ({
      id: row.id,
      "stari naziv": row.oldName,
      "stari status": row.oldIsActive,
      "novi naziv": row.newName,
      "novi status": row.newIsActive,
    })),
  );
  console.log("\nSOBE KOJE ĆE BITI REZERVNE:");
  console.table(
    reserves.map((row) => ({
      id: row.id,
      "stari naziv": row.oldName,
      "stari status": row.oldIsActive,
      "novi naziv": row.newName,
      "novi status": row.newIsActive,
    })),
  );
}

function backupPath() {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  return path.join(__dirname, "..", "backups", `rooms-before-${stamp}.json`);
}

function writeBackup(rows, plan) {
  const payload = {
    version: 1,
    createdAt: new Date().toISOString(),
    rows: rows.map(({ id, name, isActive }) => ({ id, name, isActive })),
    plan: plan.map(({ id, newName, newIsActive }) => ({ id, newName, newIsActive })),
  };
  const serialized = JSON.stringify(payload, null, 2);
  payload.sha256 = crypto.createHash("sha256").update(serialized).digest("hex");
  const target = backupPath();
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, `${JSON.stringify(payload, null, 2)}\n`, {
    encoding: "utf8",
    flag: "wx",
    mode: 0o600,
  });
  return target;
}

function verifyPlan(plan) {
  const active = plan.filter((row) => row.newIsActive);
  if (active.length !== EXPECTED_ACTIVE_COUNT) {
    throw new Error(`Provjera nije prošla: aktivnih je ${active.length}, ne 64.`);
  }
  const names = active.map((row) => row.newName);
  if (new Set(names).size !== names.length) {
    throw new Error("Provjera nije prošla: postoje dupli aktivni brojevi/nazivi.");
  }
  const expectedNames = new Set(ACTIVE_NUMBERS.map((number) => `Soba ${number}`));
  if (names.some((name) => !expectedNames.has(name))) {
    throw new Error("Provjera nije prošla: pronađen je neočekivan aktivni naziv.");
  }
}

async function readRows(client = prisma) {
  return client.table.findMany({
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: { id: true, name: true, isActive: true, createdAt: true },
  });
}

async function apply() {
  const before = await readRows();
  const plan = buildPlan(before);
  verifyPlan(plan);
  printPlan(before, plan);

  const changed = plan.filter(
    (row) => row.oldName !== row.newName || row.oldIsActive !== row.newIsActive,
  );
  if (changed.length === 0) {
    throw new Error("Baza je već u traženom stanju; ponovno izvršavanje je odbijeno.");
  }

  const backup = writeBackup(before, plan);
  console.log(`\nBackup za rollback: ${backup}`);

  await prisma.$transaction(
    async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(${ADVISORY_LOCK_KEY})`;
      const lockedRows = await readRows(tx);
      const lockedPlan = buildPlan(lockedRows);
      const snapshot = before.map(({ id, name, isActive }) => ({ id, name, isActive }));
      const lockedSnapshot = lockedRows.map(({ id, name, isActive }) => ({ id, name, isActive }));
      if (JSON.stringify(snapshot) !== JSON.stringify(lockedSnapshot)) {
        throw new Error("Podaci su se promijenili nakon pregleda; transakcija je otkazana.");
      }

      for (const row of lockedPlan) {
        if (row.oldName === row.newName && row.oldIsActive === row.newIsActive) continue;
        await tx.table.update({
          where: { id: row.id },
          data: { name: row.newName, isActive: row.newIsActive },
        });
      }

      const after = await readRows(tx);
      const active = after.filter((row) => row.isActive);
      const activeNames = active.map((row) => row.name);
      if (
        active.length !== EXPECTED_ACTIVE_COUNT ||
        new Set(activeNames).size !== EXPECTED_ACTIVE_COUNT
      ) {
        throw new Error("Završna provjera nije prošla; transakcija će biti vraćena.");
      }
      const expected = new Set(ACTIVE_NUMBERS.map((number) => `Soba ${number}`));
      if (activeNames.some((name) => !expected.has(name))) {
        throw new Error("Aktivne sobe ne odgovaraju traženoj listi; transakcija će biti vraćena.");
      }
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 120000 },
  );

  console.log("\nUSPJEH: tačno 64 sobe su aktivne, bez duplih aktivnih naziva.");
  console.log(`Rollback komanda: node scripts/reconfigure-rooms.js --rollback "${backup}"`);
}

async function rollback(file) {
  if (!file) throw new Error("--rollback zahtijeva putanju do backup JSON datoteke.");
  const resolved = path.resolve(file);
  const backup = JSON.parse(fs.readFileSync(resolved, "utf8"));
  if (backup.version !== 1 || !Array.isArray(backup.rows)) {
    throw new Error("Nepoznat ili neispravan format backup datoteke.");
  }
  const { sha256, ...unsigned } = backup;
  const actualHash = crypto
    .createHash("sha256")
    .update(JSON.stringify(unsigned, null, 2))
    .digest("hex");
  if (!sha256 || sha256 !== actualHash) throw new Error("Backup checksum nije ispravan.");

  await prisma.$transaction(
    async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(${ADVISORY_LOCK_KEY})`;
      const current = await readRows(tx);
      const currentIds = new Set(current.map((row) => row.id));
      if (
        currentIds.size !== backup.rows.length ||
        backup.rows.some((row) => !currentIds.has(row.id))
      ) {
        throw new Error("Skup ID-eva više nije isti kao u backupu; rollback je sigurno odbijen.");
      }
      for (const row of backup.rows) {
        await tx.table.update({
          where: { id: row.id },
          data: { name: row.name, isActive: row.isActive },
        });
      }
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 120000 },
  );
  console.log(`Rollback završen iz: ${resolved}`);
}

async function main() {
  const [command = "--check", argument, ...extra] = process.argv.slice(2);
  if (extra.length || !["--check", "--apply", "--rollback", "--help"].includes(command)) {
    usage();
    process.exitCode = 2;
    return;
  }
  if (command === "--help") return usage();
  if (command === "--apply") return apply();
  if (command === "--rollback") return rollback(argument);

  const rows = await readRows();
  const plan = buildPlan(rows);
  verifyPlan(plan);
  printPlan(rows, plan);
  console.log("\nDRY RUN: baza nije izmijenjena.");
  console.log("Za primjenu nakon pregleda: node scripts/reconfigure-rooms.js --apply");
}

main()
  .catch((error) => {
    console.error(`\nGREŠKA: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
