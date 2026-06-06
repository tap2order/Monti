// server/scripts/generateQRCodes.js
// to run the script: npm run qrcodes


const fs = require("fs");
const path = require("path");
const QRCode = require("qrcode");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

// Your deployed base URL (from your example)
const BASE_URL =
  process.env.CLIENT_BASE_URL || "https://monti.tap2order.ba";

function safeFileName(s) {
  return String(s).replace(/[^a-zA-Z0-9_-]/g, "_");
}

async function main() {
  const outDir = path.join(__dirname, "..", "public", "qrcodes");
  fs.mkdirSync(outDir, { recursive: true });

  const tables = await prisma.table.findMany({
    select: { id: true, name: true, token: true, isActive: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  if (!tables.length) {
    console.log("No tables found in DB.");
    return;
  }

  console.log(`Generating ${tables.length} QR codes...`);
  console.log(`BASE_URL = ${BASE_URL}`);

  for (const t of tables) {
    if (!t.isActive) {
      console.log(`Skipping table ${t.id} (inactive).`);
      continue;
    }
    if (!t.token) {
      console.log(`Skipping table ${t.id} (missing token).`);
      continue;
    }

    const url = `${BASE_URL}/t/${encodeURIComponent(t.id)}?token=${encodeURIComponent(
      t.token
    )}`;

    const label = t.name ? `${t.id}-${t.name}` : `${t.id}`;
    const filePath = path.join(outDir, `table-${safeFileName(label)}.png`);

    await QRCode.toFile(filePath, url, {
      width: 900,
      margin: 2,
      errorCorrectionLevel: "M",
    });

    console.log(`✅ ${path.basename(filePath)} -> ${url}`);
  }

  console.log(`\nDone. Files saved to: ${outDir}`);
}

main()
  .catch((e) => {
    console.error("QR generation failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });