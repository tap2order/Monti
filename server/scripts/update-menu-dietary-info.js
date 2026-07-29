const path = require("node:path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const dietaryItems = [
  { category: "Doručak do 12h", name: "Omlet po želji", dietaryInfo: "G,N,L,V" },
  { category: "Doručak do 12h", name: 'Doručak "Monti"', dietaryInfo: "L,N" },
  { category: "Doručak do 12h", name: "Brunch tost biftek", dietaryInfo: "N,L" },
  { category: "Doručak do 12h", name: "Brunch tost losos", dietaryInfo: "N" },
  { category: "Doručak do 12h", name: "Čimbur špinat", dietaryInfo: "N" },
  { category: "Doručak do 12h", name: 'Pura "Monti"', dietaryInfo: "V,N" },

  { category: "Predjela", name: 'Plata "Monti" za dvije osobe', dietaryInfo: "G,N,L,V" },
  { category: "Predjela", name: "Rolovana tikvica sa mozzarellom", dietaryInfo: "G,N,V" },
  { category: "Predjela", name: "Caponata na prepečenom hljebu", dietaryInfo: "N,V" },
  { category: "Predjela", name: "Grilovano povrće sa mozzarellom i parmezanom", dietaryInfo: "G,N,L" },
  { category: "Predjela", name: "Plata sireva", dietaryInfo: "G,N,L,V" },

  { category: "Supe i čorbe", name: "Povrtna supa", dietaryInfo: "G,N,L,V" },
  { category: "Supe i čorbe", name: "Begova čorba", dietaryInfo: "N" },
  { category: "Supe i čorbe", name: "Teleća čorba", dietaryInfo: "N" },
  { category: "Supe i čorbe", name: "Potaž od tikve", dietaryInfo: "G,N,L,V" },

  { category: "Salate", name: "Sezonska salata", dietaryInfo: "G,N,L,V" },
  { category: "Salate", name: "Šopska salata", dietaryInfo: "G,N,V" },
  { category: "Salate", name: "Salata tuna gvakamoli", dietaryInfo: "G,L,N" },
  { category: "Salate", name: "Rukola parmezan", dietaryInfo: "G" },
  { category: "Salate", name: "Kiseli kupus", dietaryInfo: "G,N,L,V" },
  { category: "Salate", name: 'Salata "Monti bašta"', dietaryInfo: "G,N,V" },

  { category: "Planinska ponuda", name: "Uštipci od heljde", dietaryInfo: "N" },
  { category: "Planinska ponuda", name: "Pileća maslenica", dietaryInfo: "N" },
  { category: "Planinska ponuda", name: "Gulaš", dietaryInfo: "G,N,L" },
  { category: "Planinska ponuda", name: "Grah sa kiselim kupusom", dietaryInfo: "G,L,N" },
  { category: "Planinska ponuda", name: "Bosanski sahan", dietaryInfo: "N,G" },
  { category: "Planinska ponuda", name: "Kljukuša za dvije osobe", dietaryInfo: "N,V" },
  { category: "Planinska ponuda", name: "Pita burek za dvije osobe 800g", dietaryInfo: "N,L" },
  { category: "Planinska ponuda", name: "Pita sirnica za dvije osobe 800g", dietaryInfo: "N,V" },
  { category: "Planinska ponuda", name: "Pita zeljanica za dvije osobe 800g", dietaryInfo: "N,V" },

  { category: 'Fast food "Monti"', name: "Pileći sendvič", dietaryInfo: "N" },
  { category: 'Fast food "Monti"', name: "Club sendvič", dietaryInfo: "N" },
  { category: 'Fast food "Monti"', name: "Big burger", dietaryInfo: "N" },
  { category: 'Fast food "Monti"', name: 'Tortilja "Monti"', dietaryInfo: "N" },

  { category: "Glavna jela", name: "Punjena piletina na milanski", dietaryInfo: "N,L" },
  { category: "Glavna jela", name: "Biftek zeleni biber", dietaryInfo: "N,L" },
  { category: "Glavna jela", name: "Biftek Café de Paris", dietaryInfo: "N" },
  { category: "Glavna jela", name: "Ribeye tagliata sa vrganjima", dietaryInfo: "N" },
  { category: "Glavna jela", name: "Puretina con salsa piccante saltiko", dietaryInfo: "L,N" },
  { category: "Glavna jela", name: "Losos u sosu od škampi", dietaryInfo: "N" },
  { category: "Glavna jela", name: "File crvene pastrmke", dietaryInfo: "N,G" },
  { category: "Glavna jela", name: "Mesna plata za dvije osobe", dietaryInfo: "L,N" },

  { category: "Wok kutak", name: "Wok piletina", dietaryInfo: "N,G,L" },
  { category: "Wok kutak", name: "Wok biftek", dietaryInfo: "N,G,L" },
  { category: "Wok kutak", name: "Wok vegetarijanski", dietaryInfo: "N,G,L,V" },

  { category: "Pasta i rižoto", name: 'Rižoto "Igman"', dietaryInfo: "N" },
  { category: "Pasta i rižoto", name: "Rižoto sa škampima", dietaryInfo: "G" },
  { category: "Pasta i rižoto", name: "Tagliatelle Alfredo", dietaryInfo: "N" },

  { category: "Jela po preporuci chefa", name: "Juneći obrazi", dietaryInfo: "G" },
  { category: "Jela po preporuci chefa", name: "Janjetina à la chef", dietaryInfo: "N" },
  { category: "Jela po preporuci chefa", name: 'Lazanja "Monti"', dietaryInfo: "L,N" },

  { category: "Pizza", name: "Margarita", dietaryInfo: "N" },
  { category: "Pizza", name: "Capricciosa", dietaryInfo: "N" },
  { category: "Pizza", name: "Domaćinska", dietaryInfo: "N" },
  { category: "Pizza", name: "Pizza četiri sira", dietaryInfo: "N" },
  { category: "Pizza", name: "Pizza Diavola", dietaryInfo: "N" },

  { category: "Desert", name: "Tart sa borovnicama", dietaryInfo: "N,V" },
  { category: "Desert", name: "Palačinci Nutella", dietaryInfo: "G" },
  { category: "Desert", name: "Palačinci džem", dietaryInfo: "V,N" },
  { category: "Desert", name: "Čokoladni sufle", dietaryInfo: "V" },
  { category: "Desert", name: "Jabuke u vanilija sosu", dietaryInfo: "V" },
  { category: "Desert", name: 'Baklava "Monti"', dietaryInfo: "V" },
  { category: "Desert", name: "Trileće", dietaryInfo: "N,V" },
  { category: "Desert", name: "Tufahija", dietaryInfo: "G,V" },
  { category: "Desert", name: "Jabukovača", dietaryInfo: "V" },
  { category: "Desert", name: "Hurmašica", dietaryInfo: "L,V" },

  { category: "Dječiji meni", name: "Pasta sa sirom", dietaryInfo: "V,N" },
  { category: "Dječiji meni", name: "Panirani pileći zalogajčići", dietaryInfo: "N" },
  { category: "Dječiji meni", name: "Sendvič sa piletinom i pomfritom", dietaryInfo: "N" },
];

function isDryRun() {
  const value = (process.env.DRY_RUN ?? "true").trim().toLowerCase();
  if (!["true", "false"].includes(value)) {
    throw new Error("DRY_RUN must be either true or false.");
  }
  return value === "true";
}

function validateInput() {
  const allowedCodes = new Set(["G", "L", "V", "N"]);
  const targets = new Set();

  for (const item of dietaryItems) {
    const codes = item.dietaryInfo.split(",");
    if (codes.some((code) => !allowedCodes.has(code)) || new Set(codes).size !== codes.length) {
      throw new Error(`Invalid dietaryInfo for ${item.category} / ${item.name}.`);
    }

    const target = `${item.category}\u0000${item.name}`;
    if (targets.has(target)) {
      throw new Error(`Duplicate input target: ${item.category} / ${item.name}.`);
    }
    targets.add(target);
  }
}

async function main() {
  validateInput();
  const dryRun = isDryRun();

  await prisma.$transaction(
    async (tx) => {
      const found = [];
      const notFound = [];
      const ambiguous = [];

      for (const item of dietaryItems) {
        const matches = await tx.menuItem.findMany({
          where: {
            name: item.name,
            category: { name: item.category },
          },
          select: {
            id: true,
            dietaryInfo: true,
          },
        });

        if (matches.length === 0) {
          notFound.push(item);
        } else if (matches.length > 1) {
          ambiguous.push({ ...item, matches: matches.length });
        } else {
          found.push({ ...item, id: matches[0].id, currentValue: matches[0].dietaryInfo });
        }
      }

      const toUpdate = found.filter((item) => item.currentValue !== item.dietaryInfo);
      const unchanged = found.length - toUpdate.length;

      console.log(`Mode: ${dryRun ? "DRY RUN" : "UPDATE"}`);
      console.log(`Configured: ${dietaryItems.length}`);
      console.log(`Found: ${found.length}`);
      console.log(`NOT FOUND: ${notFound.length}`);
      console.log(`AMBIGUOUS: ${ambiguous.length}`);
      console.log(`Already correct: ${unchanged}`);
      console.log(`Will update: ${toUpdate.length}`);

      if (notFound.length) {
        console.log("\nNOT FOUND:");
        for (const item of notFound) console.log(`- ${item.category} / ${item.name}`);
      }

      if (ambiguous.length) {
        console.log("\nAMBIGUOUS (not updated):");
        for (const item of ambiguous) {
          console.log(`- ${item.category} / ${item.name} (${item.matches} matches)`);
        }
      }

      if (dryRun) {
        console.log("\nNo database changes were made.");
        return;
      }

      for (const item of toUpdate) {
        await tx.menuItem.update({
          where: { id: item.id },
          data: { dietaryInfo: item.dietaryInfo },
        });
      }

      console.log(`\nUpdated ${toUpdate.length} MenuItem records.`);
    },
    { maxWait: 5000, timeout: 30000 },
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
