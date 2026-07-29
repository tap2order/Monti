const { PrismaClient } = require("@prisma/client");
const crypto = require("crypto");

const prisma = new PrismaClient();

function tableToken(id) {
  return crypto
    .createHash("sha256")
    .update(`table-${id}-dev-secret`)
    .digest("hex")
    .slice(0, 32);
}

async function resetDevData() {
  const reset = (process.env.SEED_RESET ?? "false").toLowerCase() === "true";
  if (!reset) return;

  console.log("🧹 SEED_RESET=true -> clearing tables...");

  // Clear in FK-safe order
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.call.deleteMany();
  await prisma.menuItem.deleteMany();
  await prisma.menuCategory.deleteMany();
  await prisma.table.deleteMany();
  await prisma.waiter.deleteMany();

  console.log("🧹 Clear done.");
}

async function seedTables() {
  for (let i = 1; i <= 12; i++) {
    const id = String(i);

    const existing = await prisma.table.findUnique({ where: { id } });
    if (existing) continue;

    await prisma.table.create({
      data: {
        id,
        name: `Table ${id}`,
        token: tableToken(id),
        isActive: true,
      },
    });
  }
  console.log("✅ Tables seeded (or already existed).");
}

async function seedWaiters() {
  const waiters = [
    { name: "Adnan", pin: "1111" },
    { name: "Faris", pin: "2222" },
    { name: "Davud", pin: "3333" },
  ];

  for (const w of waiters) {
    const exists = await prisma.waiter.findUnique({ where: { pin: w.pin } });
    if (exists) continue;

    await prisma.waiter.create({
      data: { name: w.name, pin: w.pin, isActive: true },
    });
  }

  console.log("✅ Waiters seeded (or already existed).");
}

async function seedMenu() {
  const categoryGroups = {
    Coffee: "DRINKS",
    Tea: "DRINKS",
    "Fresh Juices": "DRINKS",
    "Soft Drinks": "DRINKS",
    Cocktails: "DRINKS",
    Milkshakes: "DRINKS",
    Smoothies: "DRINKS",
    "Energy Drinks": "DRINKS",
    Desserts: "DESSERTS",
    "Ice Cream": "DESSERTS",
    Breakfast: "FOOD",
    Sandwiches: "FOOD",
    Burgers: "FOOD",
    Pasta: "FOOD",
    Salads: "FOOD",
    Pizza: "FOOD",
    Grill: "FOOD",
    Seafood: "FOOD",
    Soups: "FOOD",
    Appetizers: "FOOD",
    Wraps: "FOOD",
    "Local Specialties": "FOOD",
  };
  console.log("🌱 Seeding menu (upsert mode)...");

  const menu = [
    {
      name: "Coffee",
      items: [
        { name: "Espresso", price: 2.5 },
        { name: "Americano", price: 2.8 },
        { name: "Cappuccino", price: 3.0 },
        { name: "Latte", price: 3.2 },
        { name: "Flat White", price: 3.3 },
      ],
    },
    {
      name: "Desserts",
      items: [
        { name: "Cheesecake", price: 4.0 },
        { name: "Chocolate Cake", price: 4.5 },
        { name: "Tiramisu", price: 4.2 },
        { name: "Brownie", price: 3.8 },
        { name: "Apple Pie", price: 3.9 },
      ],
    },
    {
      name: "Tea",
      items: [
        { name: "Green Tea", price: 2.5 },
        { name: "Black Tea", price: 2.3 },
        { name: "Chamomile Tea", price: 2.4 },
        { name: "Mint Tea", price: 2.6 },
        { name: "Earl Grey", price: 2.7 },
      ],
    },
    {
      name: "Fresh Juices",
      items: [
        { name: "Orange Juice", price: 3.5 },
        { name: "Apple Juice", price: 3.2 },
        { name: "Carrot Juice", price: 3.4 },
        { name: "Mixed Fruit Juice", price: 3.8 },
        { name: "Pomegranate Juice", price: 4.0 },
      ],
    },
    {
      name: "Soft Drinks",
      items: [
        { name: "Coca-Cola", price: 2.5 },
        { name: "Fanta", price: 2.5 },
        { name: "Sprite", price: 2.5 },
        { name: "Sparkling Water", price: 2.0 },
        { name: "Still Water", price: 1.8 },
      ],
    },
    {
      name: "Breakfast",
      items: [
        { name: "Omelette", price: 5.5 },
        { name: "Scrambled Eggs", price: 5.0 },
        { name: "Pancakes", price: 4.8 },
        { name: "French Toast", price: 4.9 },
        { name: "Avocado Toast", price: 5.8 },
      ],
    },
    {
      name: "Sandwiches",
      items: [
        { name: "Chicken Sandwich", price: 6.5 },
        { name: "Tuna Sandwich", price: 6.2 },
        { name: "Club Sandwich", price: 7.0 },
        { name: "Ham & Cheese", price: 5.8 },
        { name: "Veggie Sandwich", price: 5.5 },
      ],
    },
    {
      name: "Burgers",
      items: [
        { name: "Classic Burger", price: 8.5 },
        { name: "Cheeseburger", price: 9.0 },
        { name: "Chicken Burger", price: 8.8 },
        { name: "Double Beef Burger", price: 10.5 },
        { name: "Veggie Burger", price: 8.0 },
      ],
    },
    {
      name: "Pasta",
      items: [
        { name: "Spaghetti Bolognese", price: 9.5 },
        { name: "Carbonara", price: 9.8 },
        { name: "Penne Arrabbiata", price: 8.9 },
        { name: "Fettuccine Alfredo", price: 9.7 },
        { name: "Lasagna", price: 10.0 },
      ],
    },
    {
      name: "Salads",
      items: [
        { name: "Caesar Salad", price: 7.5 },
        { name: "Greek Salad", price: 6.8 },
        { name: "Chicken Salad", price: 8.0 },
        { name: "Tuna Salad", price: 7.9 },
        { name: "Quinoa Salad", price: 7.2 },
      ],
    },
    {
      name: "Pizza",
      items: [
        { name: "Margherita", price: 8.5 },
        { name: "Pepperoni", price: 9.5 },
        { name: "Capricciosa", price: 9.8 },
        { name: "Four Cheese", price: 9.2 },
        { name: "Vegetarian", price: 8.9 },
      ],
    },
    {
      name: "Cocktails",
      items: [
        { name: "Mojito", price: 7.5 },
        { name: "Sex on the Beach", price: 8.0 },
        { name: "Pina Colada", price: 8.2 },
        { name: "Aperol Spritz", price: 7.8 },
        { name: "Whiskey Sour", price: 8.5 },
      ],
    },
    {
      name: "Grill",
      items: [
        { name: "Grilled Chicken Breast", price: 11.5 },
        { name: "Beef Steak", price: 16.0 },
        { name: "Grilled Sausages", price: 9.5 },
        { name: "Mixed Grill Platter", price: 18.5 },
        { name: "Lamb Chops", price: 17.0 },
      ],
    },
    {
      name: "Seafood",
      items: [
        { name: "Grilled Salmon", price: 14.5 },
        { name: "Fried Calamari", price: 12.0 },
        { name: "Shrimp Risotto", price: 13.5 },
        { name: "Seafood Pasta", price: 14.0 },
        { name: "Fish & Chips", price: 11.5 },
      ],
    },
    {
      name: "Soups",
      items: [
        { name: "Tomato Soup", price: 4.5 },
        { name: "Chicken Soup", price: 5.0 },
        { name: "Mushroom Soup", price: 4.8 },
        { name: "Beef Soup", price: 5.5 },
        { name: "Vegetable Soup", price: 4.6 },
      ],
    },
    {
      name: "Appetizers",
      items: [
        { name: "Bruschetta", price: 5.5 },
        { name: "Garlic Bread", price: 4.0 },
        { name: "Nachos", price: 6.0 },
        { name: "Mozzarella Sticks", price: 6.5 },
        { name: "Chicken Wings", price: 7.5 },
      ],
    },
    {
      name: "Wraps",
      items: [
        { name: "Chicken Wrap", price: 7.5 },
        { name: "Beef Wrap", price: 8.5 },
        { name: "Falafel Wrap", price: 7.0 },
        { name: "Tuna Wrap", price: 7.8 },
        { name: "Spicy Veggie Wrap", price: 7.2 },
      ],
    },
    {
      name: "Ice Cream",
      items: [
        { name: "Vanilla Scoop", price: 2.5 },
        { name: "Chocolate Scoop", price: 2.5 },
        { name: "Strawberry Scoop", price: 2.5 },
        { name: "Ice Cream Sundae", price: 4.5 },
        { name: "Banana Split", price: 5.0 },
      ],
    },
    {
      name: "Milkshakes",
      items: [
        { name: "Vanilla Milkshake", price: 4.5 },
        { name: "Chocolate Milkshake", price: 4.8 },
        { name: "Strawberry Milkshake", price: 4.6 },
        { name: "Oreo Milkshake", price: 5.0 },
        { name: "Nutella Milkshake", price: 5.2 },
      ],
    },
    {
      name: "Smoothies",
      items: [
        { name: "Berry Smoothie", price: 4.5 },
        { name: "Mango Smoothie", price: 4.8 },
        { name: "Banana Smoothie", price: 4.2 },
        { name: "Tropical Smoothie", price: 4.9 },
        { name: "Green Detox Smoothie", price: 5.0 },
      ],
    },
    {
      name: "Energy Drinks",
      items: [
        { name: "Red Bull", price: 3.5 },
        { name: "Monster", price: 3.8 },
        { name: "Guarana", price: 3.2 },
        { name: "Rockstar", price: 3.7 },
        { name: "Power Drink", price: 3.4 },
      ],
    },
    {
      name: "Local Specialties",
      items: [
        { name: "Ćevapi", price: 9.0 },
        { name: "Burek", price: 4.5 },
        { name: "Begova Čorba", price: 6.5 },
        { name: "Pljeskavica", price: 8.5 },
        { name: "Pita Sa Sirom", price: 4.2 },
      ],
    },
  ];

  for (const cat of menu) {
    // create category if missing
    const category = await prisma.menuCategory.upsert({
      where: { name: cat.name },
      update: {},
      create: { name: cat.name, group: categoryGroups[cat.name] || "OTHER" },
    });

    // create items if missing
    for (const it of cat.items) {
      const exists = await prisma.menuItem.findFirst({
        where: { categoryId: category.id, name: it.name },
      });

      if (!exists) {
        await prisma.menuItem.create({
          data: {
            name: it.name,
            price: it.price,
            categoryId: category.id,
          },
        });
      }
    }
  }

  for (const cat of menu) {
    const category = await prisma.menuCategory.upsert({
      where: { name: cat.name },
      update: {},
      create: { name: cat.name, group: categoryGroups[cat.name] || "OTHER" },
    });

    for (const it of cat.items) {
      const exists = await prisma.menuItem.findFirst({
        where: { categoryId: category.id, name: it.name },
      });

      if (!exists) {
        await prisma.menuItem.create({
          data: {
            name: it.name,
            price: it.price,
            categoryId: category.id,
          },
        });
      }
    }
  }

  console.log("✅ Menu seeded safely.");
}





async function main() {
  console.log("🌱 Seeding DB...");

  const enabled = (process.env.SEED_ENABLED ?? "true").toLowerCase() === "true";
  if (!enabled) {
    console.log("🌱 Seeding disabled (SEED_ENABLED=false).");
    return;
  }

  await resetDevData();
  await seedTables();
  await seedWaiters();
  await seedMenu();

  console.log("✅ Seed done.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
