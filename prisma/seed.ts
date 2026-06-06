import path from "path";
import fs from "fs";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

// ---------------------------------------------------------------------------
// Load .env.local then .env — must happen before PrismaClient is constructed
// ---------------------------------------------------------------------------
function loadEnv() {
  const files = [
    path.resolve(__dirname, "../.env.local"),
    path.resolve(__dirname, "../.env"),
  ];
  for (const file of files) {
    if (!fs.existsSync(file)) continue;
    for (const line of fs.readFileSync(file, "utf-8").split("\n")) {
      const t = line.trim();
      if (!t || t.startsWith("#")) continue;
      const eq = t.indexOf("=");
      if (eq === -1) continue;
      const key = t.slice(0, eq).trim();
      const val = t
        .slice(eq + 1)
        .trim()
        .replace(/^["']|["']$/g, "");
      if (!(key in process.env)) process.env[key] = val;
    }
  }
}
loadEnv();

// ---------------------------------------------------------------------------
// Prisma client via pg adapter (required by Prisma 7)
// ---------------------------------------------------------------------------
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter } as any);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const ago = (minutes: number) => new Date(Date.now() - minutes * 60 * 1000);
const daysAgo = (d: number) => new Date(Date.now() - d * 24 * 60 * 60 * 1000);
const daysFromNow = (d: number) =>
  new Date(Date.now() + d * 24 * 60 * 60 * 1000);

function orderNum(n: number) {
  return `SP-${String(n).padStart(4, "0")}`;
}

// ---------------------------------------------------------------------------
// Main seed
// ---------------------------------------------------------------------------
async function main() {
  console.log("🌱  Starting seed...\n");

  // ─── 1. Wipe existing data (reverse FK order) ─────────────────────────────
  console.log("🗑   Clearing existing data...");
  await prisma.chatMessage.deleteMany();
  await prisma.chatSession.deleteMany();
  await prisma.gameResult.deleteMany();
  await prisma.review.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.tableSession.deleteMany();
  await prisma.promotion.deleteMany();
  await prisma.aPIUsageLog.deleteMany();
  // Unlink waiters from tables before deleting
  await prisma.table.updateMany({ data: { waiterId: null } });
  await prisma.aIWaiter.deleteMany();
  await prisma.table.deleteMany();
  await prisma.dish.deleteMany();
  await prisma.category.deleteMany();
  await prisma.user.deleteMany();
  await prisma.restaurant.deleteMany();
  await prisma.subscriptionTier.deleteMany();
  console.log("   ✓ Cleared\n");

  // ─── 2. Subscription Tiers ────────────────────────────────────────────────
  console.log("💳  Creating subscription tiers...");
  const [tierBasic, tierStandard, tierPremium] = await Promise.all([
    prisma.subscriptionTier.create({
      data: {
        name: "Basic",
        maxTables: 15,
        maxWaiters: 1,
        maxTeamMembers: 2,
        monthlyPrice: 99,
        features: {
          games: false,
          analytics: false,
          posIntegration: false,
          customBranding: false,
        },
      },
    }),
    prisma.subscriptionTier.create({
      data: {
        name: "Standard",
        maxTables: 50,
        maxWaiters: 3,
        maxTeamMembers: 5,
        monthlyPrice: 199,
        features: {
          games: true,
          analytics: true,
          posIntegration: false,
          customBranding: false,
        },
      },
    }),
    prisma.subscriptionTier.create({
      data: {
        name: "Premium",
        maxTables: -1,
        maxWaiters: -1,
        maxTeamMembers: -1,
        monthlyPrice: 399,
        features: {
          games: true,
          analytics: true,
          posIntegration: true,
          customBranding: true,
        },
      },
    }),
  ]);
  console.log("   ✓ Basic / Standard / Premium\n");
  void tierBasic;
  void tierPremium;

  // ─── 3. Super Admin ───────────────────────────────────────────────────────
  console.log("👑  Creating super admin...");
  await prisma.user.create({
    data: {
      email: "superadmin@servemytable.ca",
      name: "Platform Admin",
      role: "super_admin",
      isActive: true,
      // supabaseUserId: set manually after creating this user in Supabase Dashboard
    },
  });
  console.log("   ✓ superadmin@servemytable.ca\n");

  // ─── 4. Demo Restaurant: Saffron Palace ───────────────────────────────────
  console.log("🍛  Creating Saffron Palace...");
  const restaurant = await prisma.restaurant.create({
    data: {
      name: "Saffron Palace",
      slug: "saffron-palace",
      cuisine: "Authentic Indian",
      tagline: "Where Every Meal is a Celebration of India",
      phone: "+1 (415) 555-0192",
      email: "info@saffronpalace.com",
      address: "42 Spice Lane, Little India District, San Francisco, CA 94103",
      hours: { open: "11:00", close: "23:00" },
      taxRate: 0.08875,
      currency: "USD",
      status: "active",
      isPublicDemo: true,
      setupCompletedAt: new Date(),   // demo is fully configured — skip onboarding wizard
      tierId: tierStandard.id,
    },
  });

  // ─── 5. Restaurant Owner ─────────────────────────────────────────────────
  await prisma.user.create({
    data: {
      email: "owner@saffronpalace.com",
      name: "Raj Malhotra",
      role: "restaurant_owner",
      restaurantId: restaurant.id,
      isActive: true,
      // supabaseUserId: set manually after creating this user in Supabase Dashboard
    },
  });
  console.log("   ✓ Saffron Palace + owner@saffronpalace.com\n");

  // ─── 6. Categories ────────────────────────────────────────────────────────
  console.log("📂  Creating categories...");
  const categoryNames = [
    "Starters",
    "Mains",
    "Rice & Biryani",
    "Breads",
    "Sides",
    "Beverages",
    "Desserts",
  ];
  const categories: Record<string, { id: string }> = {};
  for (let i = 0; i < categoryNames.length; i++) {
    const cat = await prisma.category.create({
      data: {
        restaurantId: restaurant.id,
        name: categoryNames[i],
        sortOrder: i + 1,
      },
    });
    categories[categoryNames[i]] = cat;
  }
  console.log("   ✓ 7 categories\n");

  // ─── 7. Dishes ────────────────────────────────────────────────────────────
  console.log("🍽   Creating 25 dishes...");
  const dishData = [
    // ── STARTERS ──────────────────────────────────────────────────────────
    {
      name: "Samosa Chaat",
      description:
        "Crispy potato-filled pastry triangles on a bed of spiced chickpeas, drizzled with tamarind chutney, mint yogurt, and a sprinkle of sev.",
      price: 9.0,
      imageEmoji: "🥟",
      spiceLevel: 2,
      isVeg: true,
      allergens: ["Gluten", "Dairy"],
      prepTime: 15,
      isPopular: true,
      categoryId: categories["Starters"].id,
    },
    {
      name: "Paneer Tikka",
      description:
        "Cubes of fresh cottage cheese marinated in tandoori spices and yogurt, grilled in the clay oven with bell peppers and onions. Served with mint chutney.",
      price: 14.0,
      imageEmoji: "🧀",
      spiceLevel: 2,
      isVeg: true,
      allergens: ["Dairy"],
      prepTime: 20,
      isChefPick: true,
      categoryId: categories["Starters"].id,
    },
    {
      name: "Chicken Tikka",
      description:
        "Boneless chicken pieces marinated overnight in spiced yogurt and grilled to perfection in the tandoor. Juicy inside, beautifully charred outside.",
      price: 14.0,
      imageEmoji: "🍗",
      spiceLevel: 2,
      allergens: ["Dairy"],
      prepTime: 20,
      isPopular: true,
      categoryId: categories["Starters"].id,
    },
    {
      name: "Veg Seekh Kebab",
      description:
        "Minced vegetables and cottage cheese blended with aromatic spices, shaped on skewers and grilled to a golden finish.",
      price: 12.0,
      imageEmoji: "🌿",
      spiceLevel: 2,
      isVeg: true,
      allergens: ["Dairy"],
      prepTime: 20,
      categoryId: categories["Starters"].id,
    },
    {
      name: "Prawn Koliwada",
      description:
        "Crispy fried prawns coated in a vibrant Maharashtrian masala paste, finished with a squeeze of lime and served with garlic-coconut chutney.",
      price: 16.0,
      imageEmoji: "🍤",
      spiceLevel: 3,
      allergens: ["Shellfish", "Gluten"],
      prepTime: 15,
      categoryId: categories["Starters"].id,
    },
    // ── MAINS ─────────────────────────────────────────────────────────────
    {
      name: "Butter Chicken",
      description:
        "Slow-cooked chicken in a velvety tomato-cream sauce infused with fenugreek and aromatic spices. The dish that won the world over. A Saffron Palace signature.",
      price: 22.0,
      imageEmoji: "🍛",
      spiceLevel: 1,
      allergens: ["Dairy", "Tree Nuts"],
      prepTime: 25,
      isPopular: true,
      isChefPick: true,
      categoryId: categories["Mains"].id,
    },
    {
      name: "Dal Makhani",
      description:
        "Whole black lentils slow-simmered for 12 hours with tomatoes, butter, and cream. A Punjabi classic that gets richer the longer it cooks.",
      price: 18.0,
      imageEmoji: "🫘",
      spiceLevel: 1,
      isVeg: true,
      allergens: ["Dairy"],
      prepTime: 20,
      isPopular: true,
      categoryId: categories["Mains"].id,
    },
    {
      name: "Palak Paneer",
      description:
        "Fresh cottage cheese nestled in a smooth, lightly spiced spinach gravy. Simple, wholesome, and deeply satisfying.",
      price: 18.0,
      imageEmoji: "🌿",
      spiceLevel: 1,
      isVeg: true,
      allergens: ["Dairy"],
      prepTime: 20,
      categoryId: categories["Mains"].id,
    },
    {
      name: "Chicken Vindaloo",
      description:
        "Fiery Goan-style curry where tender chicken absorbs bold flavours of vinegar, Kashmiri chillies, and roasted spices. Beautifully hot.",
      price: 22.0,
      imageEmoji: "🌶️",
      spiceLevel: 4,
      allergens: [],
      prepTime: 30,
      categoryId: categories["Mains"].id,
    },
    {
      name: "Paneer Butter Masala",
      description:
        "Tender paneer cubes bathed in a rich, buttery tomato-cashew gravy. Mildly spiced, creamy, and indulgent — perfect paired with butter naan.",
      price: 19.0,
      imageEmoji: "🧀",
      spiceLevel: 1,
      isVeg: true,
      allergens: ["Dairy", "Tree Nuts"],
      prepTime: 20,
      categoryId: categories["Mains"].id,
    },
    {
      name: "Lamb Rogan Josh",
      description:
        "Melt-off-the-bone lamb in a deeply aromatic Kashmiri sauce of dried chillies, fennel, cardamom, and whole spices. Slow-braised for 40 minutes.",
      price: 26.0,
      imageEmoji: "🍖",
      spiceLevel: 3,
      allergens: ["Dairy"],
      prepTime: 40,
      isChefPick: true,
      categoryId: categories["Mains"].id,
    },
    // ── RICE & BIRYANI ────────────────────────────────────────────────────
    {
      name: "Chicken Biryani",
      description:
        "Fragrant basmati rice layered with slow-cooked spiced chicken, crispy fried onions, fresh mint, saffron, and sealed with dough for authentic dum cooking.",
      price: 24.0,
      imageEmoji: "🍚",
      spiceLevel: 3,
      allergens: ["Dairy", "Tree Nuts"],
      prepTime: 35,
      isPopular: true,
      isChefPick: true,
      categoryId: categories["Rice & Biryani"].id,
    },
    {
      name: "Veg Dum Biryani",
      description:
        "Aromatic long-grain basmati cooked dum style with seasonal vegetables, caramelised onions, whole spices, and a generous touch of saffron milk.",
      price: 20.0,
      imageEmoji: "🌾",
      spiceLevel: 2,
      isVeg: true,
      allergens: ["Dairy", "Tree Nuts"],
      prepTime: 30,
      categoryId: categories["Rice & Biryani"].id,
    },
    {
      name: "Lamb Biryani",
      description:
        "Royal dum biryani with fall-apart marinated lamb, saffron-kissed basmati, crispy shallots, and a finishing drizzle of rose water. A true celebration dish.",
      price: 28.0,
      imageEmoji: "🍖",
      spiceLevel: 3,
      allergens: ["Dairy", "Tree Nuts"],
      prepTime: 45,
      categoryId: categories["Rice & Biryani"].id,
    },
    {
      name: "Steamed Basmati Rice",
      description:
        "Long-grain Pusa basmati perfectly steamed — light, fluffy, and fragrant. The ideal companion to any curry or dal.",
      price: 5.0,
      imageEmoji: "🍚",
      spiceLevel: 0,
      isVeg: true,
      isVegan: true,
      allergens: [],
      prepTime: 15,
      categoryId: categories["Rice & Biryani"].id,
    },
    // ── BREADS ────────────────────────────────────────────────────────────
    {
      name: "Butter Naan",
      description:
        "Pillowy soft leavened bread baked in our blazing tandoor and brushed generously with salted butter. Essential with any gravy dish.",
      price: 4.0,
      imageEmoji: "🫓",
      spiceLevel: 0,
      isVeg: true,
      allergens: ["Gluten", "Dairy"],
      prepTime: 10,
      isPopular: true,
      categoryId: categories["Breads"].id,
    },
    {
      name: "Garlic Naan",
      description:
        "Classic tandoor naan topped with hand-chopped garlic, fresh coriander, and a brush of butter. Aromatic, soft, and irresistibly moreish.",
      price: 5.0,
      imageEmoji: "🫓",
      spiceLevel: 0,
      isVeg: true,
      allergens: ["Gluten", "Dairy"],
      prepTime: 10,
      isPopular: true,
      categoryId: categories["Breads"].id,
    },
    {
      name: "Laccha Paratha",
      description:
        "Flaky, multi-layered whole-wheat flatbread cooked on the griddle until golden and crisp at the edges, finished with a touch of butter.",
      price: 4.0,
      imageEmoji: "🫓",
      spiceLevel: 0,
      isVeg: true,
      allergens: ["Gluten", "Dairy"],
      prepTime: 10,
      categoryId: categories["Breads"].id,
    },
    {
      name: "Puri Bhaji",
      description:
        "Three deep-fried puffed wheat breads served with a spiced potato-and-pea bhaji. A beloved Indian staple, equally wonderful at dinner.",
      price: 9.0,
      imageEmoji: "🫓",
      spiceLevel: 1,
      isVeg: true,
      allergens: ["Gluten"],
      prepTime: 15,
      categoryId: categories["Breads"].id,
    },
    // ── SIDES ─────────────────────────────────────────────────────────────
    {
      name: "Dal Tadka",
      description:
        "Sunshine-yellow split lentils tempered with a sizzling blend of ghee, cumin, garlic, dried red chilli, and fresh coriander. Rustic and comforting.",
      price: 12.0,
      imageEmoji: "🫘",
      spiceLevel: 2,
      isVeg: true,
      isVegan: true,
      allergens: [],
      prepTime: 15,
      categoryId: categories["Sides"].id,
    },
    // ── BEVERAGES ─────────────────────────────────────────────────────────
    {
      name: "Mango Lassi",
      description:
        "Thick, chilled yogurt blended with Alphonso mango pulp, a pinch of cardamom, and a touch of honey. Sweet, cooling, and utterly refreshing.",
      price: 6.0,
      imageEmoji: "🥭",
      spiceLevel: 0,
      isVeg: true,
      allergens: ["Dairy"],
      prepTime: 5,
      isPopular: true,
      categoryId: categories["Beverages"].id,
    },
    {
      name: "Masala Chai",
      description:
        "Robust Assam tea brewed with fresh ginger, green cardamom, cinnamon, and cloves, finished with steamed whole milk. India in a cup.",
      price: 4.0,
      imageEmoji: "☕",
      spiceLevel: 0,
      isVeg: true,
      allergens: ["Dairy"],
      prepTime: 5,
      categoryId: categories["Beverages"].id,
    },
    {
      name: "Fresh Lime Soda",
      description:
        "Freshly squeezed lime with chilled sparkling water — sweet, salty, or mixed. Light, zingy, and the perfect palate cleanser.",
      price: 4.0,
      imageEmoji: "🍋",
      spiceLevel: 0,
      isVeg: true,
      isVegan: true,
      allergens: [],
      prepTime: 3,
      categoryId: categories["Beverages"].id,
    },
    // ── DESSERTS ──────────────────────────────────────────────────────────
    {
      name: "Gulab Jamun",
      description:
        "Soft milk-solid dumplings fried until golden, soaked in rose-cardamom sugar syrup. Served warm with a scoop of vanilla ice cream.",
      price: 7.0,
      imageEmoji: "🍮",
      spiceLevel: 0,
      isVeg: true,
      allergens: ["Dairy", "Gluten"],
      prepTime: 10,
      isPopular: true,
      categoryId: categories["Desserts"].id,
    },
    {
      name: "Kheer",
      description:
        "Creamy rice pudding slow-cooked in full-fat milk with green cardamom and saffron, topped with toasted pistachios and silver leaf.",
      price: 8.0,
      imageEmoji: "🍮",
      spiceLevel: 0,
      isVeg: true,
      allergens: ["Dairy", "Tree Nuts"],
      prepTime: 10,
      isChefPick: true,
      categoryId: categories["Desserts"].id,
    },
  ];

  const dishes: Record<string, { id: string; price: number }> = {};
  for (const d of dishData) {
    const created = await prisma.dish.create({
      data: { restaurantId: restaurant.id, isAvailable: true, ...d } as any,
    });
    dishes[d.name] = { id: created.id, price: d.price };
  }
  console.log(`   ✓ ${dishData.length} dishes\n`);

  // ─── 8. Tables ────────────────────────────────────────────────────────────
  console.log("🪑  Creating 12 tables...");
  const tableSeats = [2, 2, 2, 2, 4, 4, 4, 4, 6, 6, 6, 8];
  const tableStatuses = [
    "empty",    // 1
    "ordering", // 2 — active received order
    "empty",    // 3
    "empty",    // 4
    "occupied", // 5 — active preparing order
    "empty",    // 6
    "ordering", // 7 — active ready order
    "empty",    // 8
    "billing",  // 9 — active served order
    "empty",    // 10
    "occupied", // 11 — active preparing order
    "empty",    // 12
  ];
  const tableRecords: { id: string; number: number }[] = [];
  for (let i = 0; i < 12; i++) {
    const t = await prisma.table.create({
      data: {
        restaurantId: restaurant.id,
        number: i + 1,
        seats: tableSeats[i],
        status: tableStatuses[i],
      },
    });
    tableRecords.push({ id: t.id, number: i + 1 });
  }
  console.log("   ✓ Tables 1–12\n");

  // ─── 9. AI Waiters ────────────────────────────────────────────────────────
  console.log("🤖  Creating AI waiters...");

  const arjun = await prisma.aIWaiter.create({
    data: {
      restaurantId: restaurant.id,
      name: "Arjun",
      avatar: "👨‍🍳",
      personality:
        "Warm, cheerful, and deeply knowledgeable about every dish on the menu. Loves sharing the story and heritage behind each recipe.",
      tone: "friendly",
      languages: ["English", "Hindi"],
      greeting:
        "Namaste! Welcome to Saffron Palace! 🙏 I'm Arjun, your personal host this evening. Before we begin, may I ask if you have any food allergies or dietary preferences?",
      isActive: true,
    },
  });

  const priya = await prisma.aIWaiter.create({
    data: {
      restaurantId: restaurant.id,
      name: "Priya",
      avatar: "👩‍💼",
      personality:
        "Elegant, precise, and deeply professional. Provides crisp, accurate recommendations with a focus on allergen safety and dietary needs.",
      tone: "professional",
      languages: ["English", "Tamil"],
      greeting:
        "Good evening, and welcome to Saffron Palace. I'm Priya, and I'll be looking after you today. To ensure a perfect experience, may I first ask about any dietary requirements or allergies?",
      isActive: true,
    },
  });

  const vikram = await prisma.aIWaiter.create({
    data: {
      restaurantId: restaurant.id,
      name: "Vikram",
      avatar: "🧑‍🍳",
      personality:
        "Fun, energetic, and full of food trivia. Turns dinner into an adventure with enthusiasm, jokes, and infectious passion for great food.",
      tone: "playful",
      languages: ["English", "Hindi", "Punjabi"],
      greeting:
        "Oye oye oye! Welcome to Saffron Palace! 🎉 I'm Vikram and tonight is going to be DELICIOUS. Before the fun begins — any allergies or foods to avoid? Safety first, party second! 😄",
      isActive: true,
    },
  });

  // Assign waiters to tables
  for (const t of tableRecords.slice(0, 4))
    await prisma.table.update({ where: { id: t.id }, data: { waiterId: arjun.id } });
  for (const t of tableRecords.slice(4, 8))
    await prisma.table.update({ where: { id: t.id }, data: { waiterId: priya.id } });
  for (const t of tableRecords.slice(8, 12))
    await prisma.table.update({ where: { id: t.id }, data: { waiterId: vikram.id } });

  console.log("   ✓ Arjun (tables 1-4) / Priya (tables 5-8) / Vikram (tables 9-12)\n");

  // ─── 10. Active Sessions & Orders ─────────────────────────────────────────
  console.log("📦  Creating sample orders...");

  const tbl = (n: number) => tableRecords.find((t) => t.number === n)!;

  function calcTotals(items: { price: number; qty: number }[]) {
    const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
    const tax = +(subtotal * restaurant.taxRate).toFixed(2);
    return {
      subtotal: +subtotal.toFixed(2),
      tax,
      total: +(subtotal + tax).toFixed(2),
    };
  }

  // ── Order 1: Table 2, status "received" ─────────────────────────────────
  const sess1 = await prisma.tableSession.create({
    data: {
      restaurantId: restaurant.id,
      tableId: tbl(2).id,
      guestCount: 2,
      dietaryPrefs: ["vegetarian"],
      startedAt: ago(30),
    },
  });
  const o1items = [
    { id: dishes["Paneer Tikka"].id, price: dishes["Paneer Tikka"].price, qty: 2 },
    { id: dishes["Butter Chicken"].id, price: dishes["Butter Chicken"].price, qty: 1 },
    { id: dishes["Garlic Naan"].id, price: dishes["Garlic Naan"].price, qty: 2 },
  ];
  const o1t = calcTotals(o1items.map((i) => ({ price: i.price, qty: i.qty })));
  const order1 = await prisma.order.create({
    data: {
      restaurantId: restaurant.id,
      orderNumber: orderNum(1),
      tableId: tbl(2).id,
      sessionId: sess1.id,
      subtotal: o1t.subtotal,
      tax: o1t.tax,
      total: o1t.total,
      status: "received",
      createdAt: ago(25),
    },
  });
  for (const item of o1items)
    await prisma.orderItem.create({
      data: { orderId: order1.id, dishId: item.id, quantity: item.qty, unitPrice: item.price },
    });

  // ── Order 2: Table 5, status "preparing" ────────────────────────────────
  const sess2 = await prisma.tableSession.create({
    data: {
      restaurantId: restaurant.id,
      tableId: tbl(5).id,
      guestCount: 3,
      dietaryPrefs: [],
      startedAt: ago(50),
    },
  });
  const o2items = [
    { id: dishes["Chicken Biryani"].id, price: dishes["Chicken Biryani"].price, qty: 2 },
    { id: dishes["Mango Lassi"].id, price: dishes["Mango Lassi"].price, qty: 2 },
    { id: dishes["Dal Tadka"].id, price: dishes["Dal Tadka"].price, qty: 1 },
  ];
  const o2t = calcTotals(o2items.map((i) => ({ price: i.price, qty: i.qty })));
  const order2 = await prisma.order.create({
    data: {
      restaurantId: restaurant.id,
      orderNumber: orderNum(2),
      tableId: tbl(5).id,
      sessionId: sess2.id,
      subtotal: o2t.subtotal,
      tax: o2t.tax,
      total: o2t.total,
      status: "preparing",
      createdAt: ago(40),
    },
  });
  for (const item of o2items)
    await prisma.orderItem.create({
      data: { orderId: order2.id, dishId: item.id, quantity: item.qty, unitPrice: item.price },
    });

  // ── Order 3: Table 7, status "ready" ────────────────────────────────────
  const sess3 = await prisma.tableSession.create({
    data: {
      restaurantId: restaurant.id,
      tableId: tbl(7).id,
      guestCount: 4,
      dietaryPrefs: [],
      startedAt: ago(55),
    },
  });
  const o3items = [
    { id: dishes["Prawn Koliwada"].id, price: dishes["Prawn Koliwada"].price, qty: 1 },
    { id: dishes["Chicken Tikka"].id, price: dishes["Chicken Tikka"].price, qty: 1 },
    { id: dishes["Lamb Rogan Josh"].id, price: dishes["Lamb Rogan Josh"].price, qty: 1 },
    { id: dishes["Butter Naan"].id, price: dishes["Butter Naan"].price, qty: 3 },
    { id: dishes["Masala Chai"].id, price: dishes["Masala Chai"].price, qty: 2 },
  ];
  const o3t = calcTotals(o3items.map((i) => ({ price: i.price, qty: i.qty })));
  const order3 = await prisma.order.create({
    data: {
      restaurantId: restaurant.id,
      orderNumber: orderNum(3),
      tableId: tbl(7).id,
      sessionId: sess3.id,
      subtotal: o3t.subtotal,
      tax: o3t.tax,
      total: o3t.total,
      status: "ready",
      specialNotes:
        "One guest has a shellfish allergy — please plate the Prawn Koliwada separately and alert kitchen.",
      createdAt: ago(45),
    },
  });
  for (const item of o3items)
    await prisma.orderItem.create({
      data: { orderId: order3.id, dishId: item.id, quantity: item.qty, unitPrice: item.price },
    });

  // ── Order 4: Table 9, status "served" (billing stage) ───────────────────
  const sess4 = await prisma.tableSession.create({
    data: {
      restaurantId: restaurant.id,
      tableId: tbl(9).id,
      guestCount: 5,
      dietaryPrefs: [],
      gamePlayUsed: true,
      discount: 5,
      startedAt: ago(95),
    },
  });
  const o4items = [
    { id: dishes["Chicken Biryani"].id, price: dishes["Chicken Biryani"].price, qty: 2 },
    { id: dishes["Lamb Biryani"].id, price: dishes["Lamb Biryani"].price, qty: 1 },
    { id: dishes["Butter Naan"].id, price: dishes["Butter Naan"].price, qty: 2 },
    { id: dishes["Gulab Jamun"].id, price: dishes["Gulab Jamun"].price, qty: 2 },
    { id: dishes["Mango Lassi"].id, price: dishes["Mango Lassi"].price, qty: 3 },
  ];
  const o4t = calcTotals(o4items.map((i) => ({ price: i.price, qty: i.qty })));
  const order4 = await prisma.order.create({
    data: {
      restaurantId: restaurant.id,
      orderNumber: orderNum(4),
      tableId: tbl(9).id,
      sessionId: sess4.id,
      subtotal: o4t.subtotal,
      tax: o4t.tax,
      discount: 5,
      total: +(o4t.subtotal + o4t.tax - 5).toFixed(2),
      status: "served",
      createdAt: ago(80),
    },
  });
  for (const item of o4items)
    await prisma.orderItem.create({
      data: { orderId: order4.id, dishId: item.id, quantity: item.qty, unitPrice: item.price },
    });

  // ── Order 5: Table 11, status "preparing" ───────────────────────────────
  const sess5 = await prisma.tableSession.create({
    data: {
      restaurantId: restaurant.id,
      tableId: tbl(11).id,
      guestCount: 6,
      dietaryPrefs: ["vegan"],
      startedAt: ago(20),
    },
  });
  const o5items = [
    { id: dishes["Veg Dum Biryani"].id, price: dishes["Veg Dum Biryani"].price, qty: 2 },
    { id: dishes["Dal Makhani"].id, price: dishes["Dal Makhani"].price, qty: 1 },
    { id: dishes["Laccha Paratha"].id, price: dishes["Laccha Paratha"].price, qty: 2 },
    { id: dishes["Fresh Lime Soda"].id, price: dishes["Fresh Lime Soda"].price, qty: 4 },
  ];
  const o5t = calcTotals(o5items.map((i) => ({ price: i.price, qty: i.qty })));
  const order5 = await prisma.order.create({
    data: {
      restaurantId: restaurant.id,
      orderNumber: orderNum(5),
      tableId: tbl(11).id,
      sessionId: sess5.id,
      subtotal: o5t.subtotal,
      tax: o5t.tax,
      total: o5t.total,
      status: "preparing",
      createdAt: ago(15),
    },
  });
  for (const item of o5items)
    await prisma.orderItem.create({
      data: { orderId: order5.id, dishId: item.id, quantity: item.qty, unitPrice: item.price },
    });

  // ── Order 6: Table 4, served (for analytics data) ───────────────────────
  const sess6 = await prisma.tableSession.create({
    data: {
      restaurantId: restaurant.id,
      tableId: tbl(4).id,
      guestCount: 2,
      dietaryPrefs: [],
      startedAt: ago(180),
      endedAt: ago(60),
    },
  });
  const o6items = [
    { id: dishes["Samosa Chaat"].id, price: dishes["Samosa Chaat"].price, qty: 2 },
    { id: dishes["Butter Chicken"].id, price: dishes["Butter Chicken"].price, qty: 1 },
    { id: dishes["Garlic Naan"].id, price: dishes["Garlic Naan"].price, qty: 2 },
    { id: dishes["Gulab Jamun"].id, price: dishes["Gulab Jamun"].price, qty: 1 },
  ];
  const o6t = calcTotals(o6items.map((i) => ({ price: i.price, qty: i.qty })));
  const order6 = await prisma.order.create({
    data: {
      restaurantId: restaurant.id,
      orderNumber: orderNum(6),
      tableId: tbl(4).id,
      sessionId: sess6.id,
      subtotal: o6t.subtotal,
      tax: o6t.tax,
      total: o6t.total,
      status: "served",
      createdAt: ago(160),
    },
  });
  for (const item of o6items)
    await prisma.orderItem.create({
      data: { orderId: order6.id, dishId: item.id, quantity: item.qty, unitPrice: item.price },
    });

  console.log("   ✓ 6 orders (received / preparing / ready / served / preparing / served)\n");

  // ─── 11. Reviews ──────────────────────────────────────────────────────────
  console.log("⭐  Creating reviews...");

  const reviewSeedData = [
    {
      tableNum: 1,
      guestCount: 2,
      startedAt: daysAgo(0),
      endedAt: ago(120),
      rating: 5,
      comment:
        "Absolutely incredible! The Butter Chicken was the best I've ever had — silky, rich, and perfectly spiced. Arjun was charming and knew everything about every dish. We'll be back next week!",
    },
    {
      tableNum: 3,
      guestCount: 3,
      startedAt: daysAgo(1),
      endedAt: new Date(daysAgo(1).getTime() + 2 * 3600 * 1000),
      rating: 4,
      comment:
        "Wonderful food and atmosphere. The Chicken Biryani was phenomenal — properly dum cooked with great depth of flavour. Priya was attentive and professional throughout.",
    },
    {
      tableNum: 6,
      guestCount: 4,
      startedAt: daysAgo(2),
      endedAt: new Date(daysAgo(2).getTime() + 2.5 * 3600 * 1000),
      rating: 5,
      comment:
        "Best Indian food in San Francisco, no question. The Paneer Tikka was perfectly charred, Dal Makhani impossibly rich, and the Kheer was pure heaven. Book this place now.",
    },
    {
      tableNum: 8,
      guestCount: 2,
      startedAt: daysAgo(3),
      endedAt: new Date(daysAgo(3).getTime() + 1.5 * 3600 * 1000),
      rating: 3,
      comment:
        "Good food overall — the Lamb Rogan Josh was tender and beautifully spiced. However the naan arrived a bit cold and the service felt slow on a busy evening. Will try again.",
    },
    {
      tableNum: 12,
      guestCount: 6,
      startedAt: daysAgo(4),
      endedAt: new Date(daysAgo(4).getTime() + 3 * 3600 * 1000),
      rating: 5,
      comment:
        "Vikram made our anniversary dinner unforgettable! His food knowledge, jokes, and genuine care were beyond anything we expected. The Chicken Vindaloo was fire (literally 🔥) and the Gulab Jamun with ice cream is a must-order. Truly outstanding.",
    },
  ];

  for (const r of reviewSeedData) {
    const rSess = await prisma.tableSession.create({
      data: {
        restaurantId: restaurant.id,
        tableId: tbl(r.tableNum).id,
        guestCount: r.guestCount,
        dietaryPrefs: [],
        startedAt: r.startedAt,
        endedAt: r.endedAt,
      },
    });
    await prisma.review.create({
      data: {
        restaurantId: restaurant.id,
        sessionId: rSess.id,
        rating: r.rating,
        comment: r.comment,
        createdAt: r.endedAt,
      },
    });
  }
  console.log("   ✓ 5 reviews (ratings: 5, 4, 5, 3, 5)\n");

  // ─── 12. Promotions ───────────────────────────────────────────────────────
  console.log("🎁  Creating promotions...");
  await prisma.promotion.create({
    data: {
      restaurantId: restaurant.id,
      title: "Happy Hour Special",
      description:
        "20% off all beverages every day from 4:00 PM to 7:00 PM. The perfect excuse for a pre-dinner Mango Lassi.",
      type: "percentage",
      value: 20,
      validFrom: new Date(),
      validUntil: daysFromNow(90),
      isActive: true,
    },
  });
  await prisma.promotion.create({
    data: {
      restaurantId: restaurant.id,
      title: "Festive Feast",
      description:
        "Complimentary Gulab Jamun with any order over $50. Because every feast deserves a sweet ending.",
      type: "free_item",
      value: 0,
      freeItemId: dishes["Gulab Jamun"].id,
      minOrder: 50,
      validFrom: new Date(),
      validUntil: daysFromNow(30),
      isActive: true,
    },
  });
  await prisma.promotion.create({
    data: {
      restaurantId: restaurant.id,
      title: "Welcome Back",
      description:
        "15% off your total bill for returning guests. Just mention it to your waiter at the start of your meal.",
      type: "percentage",
      value: 15,
      minOrder: 30,
      validFrom: new Date(),
      validUntil: daysFromNow(180),
      isActive: true,
    },
  });
  console.log("   ✓ 3 promotions\n");

  // ─── Done ─────────────────────────────────────────────────────────────────
  console.log("✅  Seed complete!\n");
  console.log("   Super Admin:       superadmin@servemytable.ca  /  Naman2019@");
  console.log("   Restaurant Owner:  owner@saffronpalace.com  /  saffron2024");
  console.log("   Restaurant slug:   saffron-palace");
  console.log("   Tables:            12  (4×2-seat, 4×4-seat, 3×6-seat, 1×8-seat)");
  console.log(`   Dishes:            ${dishData.length}`);
  console.log("   AI Waiters:        Arjun · Priya · Vikram");
  console.log("   Orders:            6  (received / preparing / ready / served / preparing / served)");
  console.log("   Reviews:           5  (⭐⭐⭐⭐⭐ / ⭐⭐⭐⭐ / ⭐⭐⭐⭐⭐ / ⭐⭐⭐ / ⭐⭐⭐⭐⭐)");
  console.log("   Promotions:        3\n");
}

main()
  .catch((e) => {
    console.error("❌  Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
