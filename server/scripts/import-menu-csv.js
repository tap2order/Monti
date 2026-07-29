const fs = require("node:fs");
const path = require("node:path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const REQUIRED_COLUMNS = [
  "categoryName",
  "name",
  "price",
  "currency",
  "sortOrder",
  "isActive",
  "isAvailable",
];

function parseCsv(input) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;

  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];

    if (quoted) {
      if (char === '"' && input[i + 1] === '"') {
        field += '"';
        i += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (char !== "\r") {
      field += char;
    }
  }

  if (quoted) throw new Error("CSV has an unterminated quoted field.");
  if (field.length || row.length) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}

function booleanValue(value, column, line) {
  const normalized = value.trim().toLowerCase();
  if (normalized === "true") return true;
  if (normalized === "false") return false;
  throw new Error(`Line ${line}: ${column} must be True or False.`);
}

function loadMenu(csvPath) {
  const text = fs.readFileSync(csvPath, "utf8").replace(/^\uFEFF/, "");
  const rows = parseCsv(text);
  if (rows.length < 2) throw new Error("CSV contains no menu items.");

  const headers = rows[0].map((header) => header.trim());
  for (const column of REQUIRED_COLUMNS) {
    if (!headers.includes(column)) throw new Error(`Missing CSV column: ${column}`);
  }

  const seen = new Set();
  const categories = new Map();

  rows.slice(1).forEach((values, index) => {
    const line = index + 2;
    if (values.length === 1 && values[0].trim() === "") return;
    if (values.length !== headers.length) {
      throw new Error(`Line ${line}: expected ${headers.length} columns, got ${values.length}.`);
    }

    const raw = Object.fromEntries(headers.map((header, i) => [header, values[i].trim()]));
    if (!raw.categoryName || !raw.name) {
      throw new Error(`Line ${line}: categoryName and name are required.`);
    }

    const price = Number(raw.price);
    const sortOrder = Number(raw.sortOrder);
    if (!Number.isFinite(price) || price < 0) throw new Error(`Line ${line}: invalid price.`);
    if (!Number.isInteger(sortOrder)) throw new Error(`Line ${line}: invalid sortOrder.`);

    const key = `${raw.categoryName}\u0000${raw.name}`;
    if (seen.has(key)) throw new Error(`Line ${line}: duplicate item "${raw.name}".`);
    seen.add(key);

    if (!categories.has(raw.categoryName)) categories.set(raw.categoryName, []);
    categories.get(raw.categoryName).push({
      name: raw.name,
      name1: raw.name1 || null,
      name2: raw.name2 || null,
      name3: raw.name3 || null,
      name4: raw.name4 || null,
      imageUrl: raw.imageUrl || null,
      price,
      currency: raw.currency || "BAM",
      sortOrder,
      isActive: booleanValue(raw.isActive, "isActive", line),
      isAvailable: booleanValue(raw.isAvailable, "isAvailable", line),
    });
  });

  return categories;
}

async function main() {
  const csvArg = process.argv.find((arg) => !arg.startsWith("--") && arg !== process.argv[0] && arg !== process.argv[1]);
  if (!csvArg) {
    throw new Error("Usage: node scripts/import-menu-csv.js <file.csv> [--replace-menu]");
  }

  const csvPath = path.resolve(csvArg);
  const categories = loadMenu(csvPath);
  const itemCount = [...categories.values()].reduce((sum, items) => sum + items.length, 0);

  console.log(`Validated ${itemCount} items in ${categories.size} categories from ${csvPath}.`);
  if (!process.argv.includes("--replace-menu")) {
    console.log("Dry run only. Add --replace-menu to replace the menu in the database.");
    return;
  }

  await prisma.$transaction(async (tx) => {
    await tx.menuItem.deleteMany();
    await tx.menuCategory.deleteMany();

    let categorySortOrder = 1;
    for (const [name, items] of categories) {
      await tx.menuCategory.create({
        data: {
          name,
          sortOrder: categorySortOrder,
          items: { create: items },
        },
      });
      categorySortOrder += 1;
    }
  });

  const [dbCategories, dbItems] = await Promise.all([
    prisma.menuCategory.count(),
    prisma.menuItem.count(),
  ]);
  if (dbCategories !== categories.size || dbItems !== itemCount) {
    throw new Error(`Post-import count mismatch: ${dbCategories} categories, ${dbItems} items.`);
  }

  console.log(`Menu replaced successfully: ${dbCategories} categories, ${dbItems} items.`);
}

main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
