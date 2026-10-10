/**
 * RIVKAH LUXE seed script.
 *
 *   npm run db:seed
 *
 * Creates:
 *   • the owner (Super Admin) account from SEED_ADMIN_* env vars
 *   • store settings, homepage content, pages, FAQ and shipping zones (real
 *     configuration the owner will edit — not marked as demo)
 *   • DEMO products, reviews, customers, orders, coupons, promotions,
 *     subscribers and messages — every one has isDemo = true (or an
 *     @example.com email) so `npm run db:remove-demo` can delete them before launch.
 *
 * Safe to re-run: configuration is upserted, demo data is only created once.
 */
import "dotenv/config";
import bcrypt from "bcryptjs";
import type { Prisma } from "../src/generated/prisma/client";
import { createClient } from "../src/lib/db-client";

const db = createClient();

const C = (dollars: number) => Math.round(dollars * 100); // CAD → cents
const daysAgo = (d: number, h = 10) => new Date(Date.now() - d * 86400000 - h * 3600000);

async function seedOwner() {
  const email = (process.env.SEED_ADMIN_EMAIL || "").toLowerCase().trim();
  const password = process.env.SEED_ADMIN_PASSWORD || "";
  if (!email || password.length < 10) {
    console.warn("⚠ SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD (10+ chars) not set — skipping owner account. Use `npm run admin:create` later.");
    return;
  }
  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`✓ Owner account already exists (${email})`);
    return;
  }
  await db.user.create({
    data: { email, name: process.env.SEED_ADMIN_NAME || "Store Owner", passwordHash: await bcrypt.hash(password, 12), role: "SUPER_ADMIN" },
  });
  console.log(`✓ Owner (Super Admin) created: ${email}`);
}

async function seedConfig() {
  const store = {
    storeName: "Rivkah Luxe",
    tagline: "Luxury care, made for you.",
    currency: "CAD",
    timezone: "America/Toronto",
    storeOpen: true,
    announcement: {
      enabled: true,
      messages: ["Free shipping across Canada on orders over $85", "Now shipping worldwide — including the US and Nigeria", "New: Peach Bloom Moisturizing Body Oil"],
      link: "/shop",
    },
    newsletter: { heading: "Join the inner circle", text: "New arrivals, restocks and quiet offers — straight to your inbox." },
  };
  await db.setting.upsert({ where: { key: "store" }, create: { key: "store", value: store }, update: {} });

  const sections: Record<string, Prisma.InputJsonValue> = {
    hero: { imageUrl: "/demo/hero-packaging.webp" },
    brandStory: { imageUrl: "/demo/products/cinnamon-kiss-oil.webp" },
    promoBanner: { imageUrl: "/demo/hero-packaging.webp" },
    social: {
      heading: "Follow the glow",
      text: "Share your ritual with us",
      images: [
        "/demo/products/cinnamon-kiss-oil.webp",
        "/demo/products/glow-body-oil.webp",
        "/demo/products/peach-bloom-oil.webp",
        "/demo/products/vanilla-cashmere-oil.webp",
        "/demo/products/cinnamon-delight-oil.webp",
        "/demo/hero-packaging.webp",
      ],
    },
  };
  for (const [key, data] of Object.entries(sections)) {
    await db.homepageSection.upsert({ where: { key }, create: { key, data }, update: {} });
  }

  const zones = [
    { name: "Canada", countries: ["CA"], regions: [], fee: C(12), freeOverAmount: C(85), estimatedDelivery: "3–7 business days", sortOrder: 0 },
    { name: "United States", countries: ["US"], regions: [], fee: C(18), freeOverAmount: C(150), estimatedDelivery: "5–10 business days", sortOrder: 1 },
    { name: "Nigeria", countries: ["NG"], regions: [], fee: C(35), freeOverAmount: null, estimatedDelivery: "7–14 business days", sortOrder: 2 },
    { name: "Rest of the world", countries: [], regions: [], fee: C(40), freeOverAmount: null, estimatedDelivery: "10–21 business days", sortOrder: 3, isFallback: true },
  ];
  if ((await db.shippingZone.count()) === 0) {
    await db.shippingZone.createMany({ data: zones });
    console.log("✓ Delivery zones");
  }

  const pages: { slug: string; title: string; body: string }[] = [
    {
      slug: "about",
      title: "About Rivkah Luxe",
      body: `<h2>Luxury care, made for you.</h2>
<p>Rivkah Luxe was created for women who believe that caring for their skin is a daily act of self-respect. Our body oils, scrubs and butters are blended in small batches and finished by hand, with fragrances designed to linger softly through your day.</p>
<p>We pour the same care into every detail — from the oils we choose to the black-and-gold box your order arrives in — so that each time you reach for Rivkah Luxe, it feels like a moment that's entirely yours.</p>
<h3>Our promise</h3>
<ul><li>Small-batch blends, checked before every dispatch</li><li>Honest labels that list every ingredient</li><li>Packaging you'll be proud to gift</li></ul>
<p><em>Store owner: edit this page under Website Content → Pages to tell your own story.</em></p>`,
    },
    {
      slug: "shipping-delivery",
      title: "Shipping & Delivery",
      body: `<p>We ship from Canada to customers worldwide. Shipping fees and estimated delivery times depend on your country (and province or state) and are always shown at checkout before you pay.</p>
<h3>International orders</h3><p>Orders shipped outside Canada may be subject to import duties and taxes charged by the destination country. These are set by local customs and are the customer's responsibility.</p>
<h3>Processing time</h3><p>Orders are packed within 1–2 business days of payment. You'll receive an email when your order ships.</p>
<h3>Tracking</h3><p>You can follow your order at any time on the <a href="/track-order">Track Order</a> page using your order number and email address.</p>
<h3>Delivery issues</h3><p>If something isn't right with your delivery, contact us within 48 hours and we'll make it right.</p>`,
    },
    {
      slug: "returns-refunds",
      title: "Returns & Refunds",
      body: `<p>Because our products are personal-care items, we can only accept returns of <strong>unopened, unused</strong> items in their original packaging within <strong>14 days</strong> of delivery.</p>
<h3>Damaged or incorrect items</h3><p>If your order arrives damaged or you received the wrong item, please contact us within 48 hours of delivery with photos and your order number. We'll arrange a replacement or refund.</p>
<h3>Refunds</h3><p>Approved refunds are made to your original payment method. Depending on your bank, it can take 5–10 business days to appear. Return shipping is paid by the customer unless the item arrived damaged or incorrect.</p>
<h3>How to start a return</h3><p>Send us a message through the <a href="/contact">Contact</a> page or WhatsApp with your order number.</p>`,
    },
    {
      slug: "privacy-policy",
      title: "Privacy Policy",
      body: `<p>This policy explains what personal information Rivkah Luxe collects and how we use it. <em>Store owner: please have this reviewed before launch for Canada's PIPEDA (and Quebec's Law 25 if you sell there), and for the privacy laws of other countries you sell to.</em></p>
<h3>What we collect</h3><p>When you place an order or create an account we collect your name, email address, phone number and delivery address. We do not see or store your card details — payments are handled by our payment provider.</p>
<h3>How we use it</h3><ul><li>To process and deliver your orders</li><li>To send order updates and account emails</li><li>To send newsletters and offers — only if you have opted in. You can unsubscribe at any time, in line with Canada's Anti-Spam Legislation (CASL).</li></ul>
<h3>Sharing</h3><p>We share only what is needed with our payment providers (Stripe, Paystack) and delivery partners to complete your order. Some of these providers may store data outside Canada. We never sell your data.</p>
<h3>Your choices</h3><p>You can update your details in your account, unsubscribe from emails at any time, or ask us to delete your data by contacting us.</p>`,
    },
    {
      slug: "terms-and-conditions",
      title: "Terms & Conditions",
      body: `<p>By using this website and placing an order you agree to these terms. <em>Please have these terms reviewed before launch.</em></p>
<h3>Orders</h3><p>An order is confirmed once payment has been verified. We may cancel and fully refund an order if an item becomes unavailable or a pricing error occurs.</p>
<h3>Prices &amp; currency</h3><p>Prices are set in Canadian dollars (CAD). If you choose another currency, prices are converted at our current exchange rate and you are charged the amount shown at checkout. Applicable sales taxes are added at checkout. Import duties on international orders are not included.</p>
<h3>Product use</h3><p>Our products are for external use only. Please check the ingredient list before use and do a patch test if you have sensitive skin. Stop use if irritation occurs.</p>
<h3>Contact</h3><p>Questions about these terms? Reach us through the <a href="/contact">Contact</a> page.</p>`,
    },
    {
      slug: "cookie-policy",
      title: "Cookie Policy",
      body: `<p>We use a small number of cookies to make this website work.</p>
<h3>Essential cookies</h3><ul><li><strong>rl_session</strong> — keeps you signed in</li><li><strong>rl_cart</strong> — remembers your shopping bag</li></ul>
<h3>Analytics</h3><ul><li><strong>rl_currency</strong> — remembers the currency you chose</li></ul><p>We may use privacy-friendly, cookie-less analytics to understand which pages are visited. This does not identify you personally.</p>
<p>You can clear cookies at any time in your browser settings; you'll be signed out and your bag may be emptied.</p>`,
    },
  ];
  for (const p of pages) await db.page.upsert({ where: { slug: p.slug }, create: p, update: {} });

  if ((await db.faqItem.count()) === 0) {
    await db.faqItem.createMany({
      data: [
        { group: "Orders & delivery", question: "Where do you ship?", answer: "We ship from Canada to customers worldwide, including the United States and Nigeria. Shipping fees and delivery times for your country are shown at checkout.", sortOrder: 0 },
        { group: "Orders & delivery", question: "How can I track my order?", answer: "Use the Track Order page with your order number and the email you used at checkout. Signed-in customers can also see orders in their account.", sortOrder: 1 },
        { group: "Orders & delivery", question: "Will I pay customs duties?", answer: "Orders shipped outside Canada may be charged import duties or taxes by your country's customs. These are not included in our prices.", sortOrder: 2 },
        { group: "Payments", question: "Which payment methods do you accept?", answer: "Pay securely by credit or debit card, Apple Pay or Google Pay through Stripe. Shoppers paying in Nigerian naira can also use bank transfer or USSD through Paystack. We never see or store your card details.", sortOrder: 3 },
        { group: "Payments", question: "Can I pay in my own currency?", answer: "Yes — choose CAD, USD or NGN from the currency menu. Prices are converted from Canadian dollars at our current rate.", sortOrder: 3 },
        { group: "Payments", question: "My payment failed — what should I do?", answer: "No money is taken for failed payments. You can try again from the payment page, or contact us and we'll help.", sortOrder: 4 },
        { group: "Products", question: "How should I use the body oils?", answer: "Gently apply after a shower or bath, ideally on damp skin for better absorption.", sortOrder: 5 },
        { group: "Products", question: "Are your products suitable for sensitive skin?", answer: "Every ingredient is listed on the product page. If you have sensitive skin, please patch test first and stop use if irritation occurs.", sortOrder: 6 },
        { group: "Returns", question: "Can I return a product?", answer: "Unopened, unused items can be returned within 14 days of delivery. See our Returns & Refunds page for details.", sortOrder: 7 },
      ],
    });
  }
  console.log("✓ Settings, homepage content, pages and FAQ");
}

async function seedCatalogue() {
  const cats = [
    { name: "Body Oils", slug: "body-oils", description: "Silky, fast-absorbing oils for a lasting glow.", imageUrl: "/demo/products/peach-bloom-oil.webp", sortOrder: 0 },
    { name: "Body Scrubs", slug: "body-scrubs", description: "Polish, soften and reveal smoother skin.", imageUrl: "/demo/products/cinnamon-kiss-scrub.webp", sortOrder: 1 },
    { name: "Body Butter", slug: "body-butter", description: "Rich, whipped moisture for deep comfort.", imageUrl: "/demo/products/whipped-body-butter.webp", sortOrder: 2 },
    { name: "Skincare", slug: "skincare", description: "Gentle essentials for everyday care.", imageUrl: "/demo/products/glow-body-oil.webp", sortOrder: 3 },
    { name: "Gift Sets", slug: "gift-sets", description: "Wrapped in black and gold, ready to give.", imageUrl: "/demo/hero-packaging.webp", sortOrder: 4 },
  ];
  const catId: Record<string, string> = {};
  for (const c of cats) {
    const row = await db.category.upsert({ where: { slug: c.slug }, create: c, update: {} });
    catId[c.slug] = row.id;
  }
  const newArrivals = await db.collection.upsert({
    where: { slug: "new-arrivals" },
    create: { name: "New Arrivals", slug: "new-arrivals", description: "The latest additions to the Rivkah Luxe collection.", imageUrl: "/demo/products/peach-bloom-oil-2.webp" },
    update: {},
  });
  const valentine = await db.collection.upsert({
    where: { slug: "valentines-edit" },
    create: { name: "Valentine's Edit", slug: "valentines-edit", description: "Warm, romantic scents to gift — or keep.", imageUrl: "/demo/products/cinnamon-kiss-oil.webp" },
    update: {},
  });

  if ((await db.product.count({ where: { isDemo: true } })) > 0) {
    console.log("✓ Demo products already exist");
    return;
  }

  const oilIngredients = "Sunflower Seed Oil, Apricot Seed Oil, Jojoba Oil, Avocado Oil, Vitamin E, Fragrance.";
  const oilHowTo = "Gently apply after a shower or bath, or whenever your skin needs it. For best results, apply to damp skin for better absorption.";

  type V = { name: string; sku: string; price: number; salePrice?: number; cost?: number; stock: number; low?: number; weight?: number; image?: string; optionType?: string };
  type P = {
    name: string; slug: string; sku: string; category: string; short: string; description: string;
    ingredients?: string; benefits?: string; howToUse?: string; size?: string; tags: string[];
    images: string[]; variants: V[]; featured?: boolean; collections?: string[]; createdDaysAgo: number;
  };

  const products: P[] = [
    {
      name: "Cinnamon Kiss Moisturizing Body Oil", slug: "cinnamon-kiss-body-oil", sku: "RL-CK-OIL", category: "body-oils",
      short: "A warm, spiced body oil that melts into skin and leaves a soft, lingering glow.",
      description: "<p>Cinnamon Kiss wraps your skin in warmth. A blend of lightweight oils glides on easily and absorbs without a greasy finish, leaving skin feeling soft with a subtle sheen and a cosy cinnamon scent that stays with you.</p>",
      ingredients: oilIngredients, benefits: "Leaves skin feeling soft and moisturised\nLightweight, non-greasy finish\nWarm cinnamon fragrance", howToUse: oilHowTo,
      size: "118ml · 189ml · 237ml", tags: ["cinnamon", "body oil", "warm", "bestseller"],
      images: ["/demo/products/cinnamon-kiss-oil.webp", "/demo/products/cinnamon-kiss-oil.webp", "/demo/products/cinnamon-kiss-oil-2.webp"],
      variants: [
        { name: "118ml", sku: "RL-CK-OIL-118", price: C(18), cost: C(7), stock: 24, weight: 180, image: "/demo/products/cinnamon-kiss-oil.webp", optionType: "Volume" },
        { name: "189ml", sku: "RL-CK-OIL-189", price: C(26), cost: C(10), stock: 18, weight: 260, image: "/demo/products/cinnamon-kiss-oil-2.webp", optionType: "Volume" },
        { name: "237ml", sku: "RL-CK-OIL-237", price: C(32), salePrice: C(29), cost: C(12.5), stock: 12, weight: 320, image: "/demo/products/cinnamon-kiss-oil.webp", optionType: "Volume" },
      ],
      featured: true, collections: [valentine.id], createdDaysAgo: 120,
    },
    {
      name: "Peach Bloom Moisturizing Body Oil", slug: "peach-bloom-body-oil", sku: "RL-PB-OIL", category: "body-oils",
      short: "Soft, fruity and floral — a bright everyday body oil with a delicate peach scent.",
      description: "<p>Peach Bloom is sunshine in a bottle. Light oils sink in quickly for skin that feels supple and smooth, finished with a juicy peach and soft floral fragrance.</p>",
      ingredients: oilIngredients, benefits: "Fast-absorbing, everyday moisture\nSoft, radiant-looking finish\nFresh peach & floral scent", howToUse: oilHowTo,
      size: "189ml · 237ml", tags: ["peach", "floral", "body oil", "new"],
      images: ["/demo/products/peach-bloom-oil.webp", "/demo/products/peach-bloom-oil-2.webp"],
      variants: [
        { name: "189ml", sku: "RL-PB-OIL-189", price: C(26), cost: C(10), stock: 20, weight: 260, image: "/demo/products/peach-bloom-oil-2.webp", optionType: "Volume" },
        { name: "237ml", sku: "RL-PB-OIL-237", price: C(32), cost: C(12.5), stock: 15, weight: 320, image: "/demo/products/peach-bloom-oil.webp", optionType: "Volume" },
      ],
      featured: true, collections: [newArrivals.id], createdDaysAgo: 9,
    },
    {
      name: "Vanilla Cashmere Moisturizing Body Oil", slug: "vanilla-cashmere-body-oil", sku: "RL-VC-OIL", category: "body-oils",
      short: "Creamy vanilla wrapped in softness — comforting, elegant and endlessly wearable.",
      description: "<p>Vanilla Cashmere feels like your favourite knit. A smooth blend of oils leaves skin feeling nourished, with a creamy vanilla scent that is warm without being sweet.</p>",
      ingredients: oilIngredients, benefits: "Comforting, all-day moisture\nSilky, non-sticky feel\nCreamy vanilla scent", howToUse: oilHowTo,
      size: "189ml · 237ml", tags: ["vanilla", "body oil", "gourmand"],
      images: ["/demo/products/vanilla-cashmere-oil.webp", "/demo/products/vanilla-cashmere-oil-2.webp"],
      variants: [
        { name: "189ml", sku: "RL-VC-OIL-189", price: C(26), cost: C(10), stock: 14, weight: 260, image: "/demo/products/vanilla-cashmere-oil-2.webp", optionType: "Volume" },
        { name: "237ml", sku: "RL-VC-OIL-237", price: C(32), cost: C(12.5), stock: 4, low: 5, weight: 320, image: "/demo/products/vanilla-cashmere-oil.webp", optionType: "Volume" },
      ],
      featured: true, createdDaysAgo: 90,
    },
    {
      name: "Vanilla Velvet Moisturizing Body Oil", slug: "vanilla-velvet-body-oil", sku: "RL-VV-OIL", category: "body-oils",
      short: "A rich, velvety vanilla body oil for evenings and slow self-care rituals.",
      description: "<p>Vanilla Velvet is our most indulgent vanilla — deeper, softer and made for unhurried evenings.</p>",
      ingredients: oilIngredients, howToUse: oilHowTo, size: "237ml", tags: ["vanilla", "body oil"],
      images: ["/demo/products/vanilla-velvet-oil.webp"],
      variants: [{ name: "237ml", sku: "RL-VV-OIL-237", price: C(34), cost: C(13), stock: 10, weight: 320, optionType: "Volume" }],
      collections: [newArrivals.id], createdDaysAgo: 4,
    },
    {
      name: "Cinnamon Delight Moisturizing Body Oil", slug: "cinnamon-delight-body-oil", sku: "RL-CD-OIL", category: "body-oils",
      short: "Sweet cinnamon with a playful twist — a comforting oil for everyday glow.",
      description: "<p>Cinnamon Delight brings a sweeter take on our signature spice, leaving skin soft with a cheerful, comforting scent.</p>",
      ingredients: oilIngredients, howToUse: oilHowTo, size: "237ml", tags: ["cinnamon", "body oil"],
      images: ["/demo/products/cinnamon-delight-oil.webp"],
      variants: [{ name: "237ml", sku: "RL-CD-OIL-237", price: C(32), cost: C(12.5), stock: 9, weight: 320, optionType: "Volume" }],
      collections: [valentine.id], createdDaysAgo: 60,
    },
    {
      name: "Glow Body Oil", slug: "glow-body-oil", sku: "RL-GLOW", category: "skincare",
      short: "Shea butter and sweet almond oil for a lightweight, hydrating glow.",
      description: "<p>Our Glow Body Oil pairs shea butter with sweet almond oil for a lightweight finish that leaves skin looking luminous.</p>",
      ingredients: "Shea Butter, Sweet Almond Oil. (Full ingredient list to be added.)", benefits: "Lightweight\nHydrating\nLuminous-looking finish", howToUse: oilHowTo,
      size: "100ml", tags: ["glow", "almond", "shea", "body oil"],
      images: ["/demo/products/glow-body-oil.webp"],
      variants: [{ name: "100ml", sku: "RL-GLOW-100", price: C(22), salePrice: C(19), cost: C(8), stock: 30, weight: 150, optionType: "Volume" }],
      featured: true, createdDaysAgo: 45,
    },
    {
      name: "Cinnamon Kiss Body Scrub", slug: "cinnamon-kiss-body-scrub", sku: "RL-CK-SCRUB", category: "body-scrubs",
      short: "A warm, polishing scrub that leaves skin smooth and ready for oil.",
      description: "<p>Our Cinnamon Kiss scrub buffs away dullness and leaves skin feeling smooth and soft — the perfect first step before your body oil.</p>",
      howToUse: "On damp skin, massage a small amount in circular motions. Rinse well. Follow with Cinnamon Kiss Body Oil. Avoid broken or irritated skin.",
      size: "237ml · 500ml", tags: ["scrub", "cinnamon", "exfoliate"],
      images: ["/demo/products/cinnamon-kiss-scrub.webp"],
      variants: [
        { name: "237ml", sku: "RL-CK-SCRUB-237", price: C(24), cost: C(9), stock: 16, weight: 350, optionType: "Size" },
        { name: "500ml", sku: "RL-CK-SCRUB-500", price: C(42), cost: C(16), stock: 7, weight: 680, optionType: "Size" },
      ],
      createdDaysAgo: 30,
    },
    {
      name: "Whipped Body Butter", slug: "whipped-body-butter", sku: "RL-BUTTER", category: "body-butter",
      short: "Cloud-light whipped butter for deep, comforting moisture.",
      description: "<p>Our whipped body butter is light to the touch but rich on the skin. Choose your scent.</p>",
      howToUse: "Scoop a small amount and massage into skin until absorbed. Best on elbows, knees and heels.",
      size: "250ml", tags: ["body butter", "shea", "moisture"],
      images: ["/demo/products/whipped-body-butter.webp"],
      variants: [
        { name: "Vanilla", sku: "RL-BUTTER-VAN", price: C(28), cost: C(10.5), stock: 3, low: 5, weight: 300, optionType: "Fragrance" },
        { name: "Cinnamon", sku: "RL-BUTTER-CIN", price: C(28), cost: C(10.5), stock: 0, low: 5, weight: 300, optionType: "Fragrance" },
      ],
      createdDaysAgo: 20,
    },
    {
      name: "The Signature Gift Set", slug: "signature-gift-set", sku: "RL-GIFT-SIG", category: "gift-sets",
      short: "Three body oils of your choice, presented in our black and gold Rivkah Luxe box.",
      description: "<p>Our signature box, packed by hand with three of our best-loved body oils. Ready to gift — or to keep.</p><p>Add a note at checkout under delivery instructions and we'll handwrite it on a card.</p>",
      size: "3 × 189ml", tags: ["gift", "set", "box", "valentine"],
      images: ["/demo/hero-packaging.webp", "/demo/products/peach-bloom-oil-2.webp", "/demo/products/vanilla-cashmere-oil-2.webp"],
      variants: [
        { name: "Set of 3", sku: "RL-GIFT-SIG-3", price: C(76), salePrice: C(69), cost: C(31), stock: 6, low: 3, weight: 1100, optionType: "Pack size" },
      ],
      featured: false, collections: [valentine.id], createdDaysAgo: 15,
    },
  ];

  for (const p of products) {
    const minPrice = Math.min(...p.variants.map((v) => (v.salePrice && v.salePrice < v.price ? v.salePrice : v.price)));
    await db.product.create({
      data: {
        name: p.name, slug: p.slug, sku: p.sku, shortDescription: p.short, description: p.description,
        ingredients: p.ingredients, benefits: p.benefits, howToUse: p.howToUse, size: p.size, tags: p.tags,
        status: "PUBLISHED", isFeatured: !!p.featured, minPrice, categoryId: catId[p.category], isDemo: true,
        seoTitle: `${p.name} | Rivkah Luxe`, seoDescription: p.short,
        createdAt: daysAgo(p.createdDaysAgo),
        images: { create: p.images.map((url, i) => ({ url, alt: p.name, sortOrder: i })) },
        variants: {
          create: p.variants.map((v, i) => ({
            name: v.name, sku: v.sku, price: v.price, salePrice: v.salePrice ?? null, costPrice: v.cost ?? null,
            stock: v.stock, lowStockThreshold: v.low ?? 5, weightGrams: v.weight ?? null, imageUrl: v.image ?? null,
            optionType: v.optionType ?? "Size", isDefault: i === 0, sortOrder: i,
            movements: { create: { change: v.stock, stockAfter: v.stock, reason: "INITIAL", note: "Opening stock (demo)" } },
          })),
        },
        collections: p.collections ? { connect: p.collections.map((id) => ({ id })) } : undefined,
      },
    });
  }
  console.log(`✓ ${products.length} demo products`);
}

async function seedPeopleAndOrders() {
  if ((await db.user.count({ where: { isDemo: true } })) > 0) {
    console.log("✓ Demo customers & orders already exist");
    return;
  }
  const hash = await bcrypt.hash("DemoCustomer123!", 12);
  const customers = [
    { name: "Amara Okafor", email: "amara.o@example.com", phone: "+1 416 555 0101", country: "CA", state: "ON", city: "Toronto", postal: "M5V 2T6", line1: "200 Wellington St W, Unit 1204", days: 60 },
    { name: "Chloe Tremblay", email: "chloe@example.com", phone: "+1 514 555 0102", country: "CA", state: "QC", city: "Montréal", postal: "H2X 1Y4", line1: "455 Rue Sherbrooke O", days: 50 },
    { name: "Priya Sharma", email: "priya@example.com", phone: "+1 604 555 0103", country: "CA", state: "BC", city: "Vancouver", postal: "V6B 1A1", line1: "88 W Pender St", days: 40 },
    { name: "Jasmine Carter", email: "jasmine@example.com", phone: "+1 713 555 0104", country: "US", state: "TX", city: "Houston", postal: "77002", line1: "1200 Main St, Apt 9", days: 28 },
    { name: "Funmilayo Kuti", email: "funmi@example.com", phone: "+234 803 000 0005", country: "NG", state: "FCT", city: "Abuja", postal: "", line1: "3 Gana Street, Maitama", days: 14 },
    { name: "Hannah Bello", email: "hannah@example.com", phone: "+1 403 555 0106", country: "CA", state: "AB", city: "Calgary", postal: "T2P 1J9", line1: "500 Centre St S", days: 3 },
  ];
  const users = [];
  for (const c of customers) {
    users.push(
      await db.user.create({
        data: {
          name: c.name, email: c.email, phone: c.phone, passwordHash: hash, isDemo: true, createdAt: daysAgo(c.days),
          addresses: { create: { fullName: c.name, phone: c.phone, line1: c.line1, city: c.city, state: c.state, postalCode: c.postal || null, country: c.country, isDefault: true } },
        },
      }),
    );
  }

  const variants = await db.productVariant.findMany({ include: { product: { include: { images: { take: 1 } } } } });
  const byS = (sku: string) => variants.find((v) => v.sku === sku)!;
  const zones = await db.shippingZone.findMany();
  const zoneFor = (country: string) => zones.find((z) => z.countries.includes(country)) ?? zones.find((z) => z.isFallback)!;
  const TAX: Record<string, number> = { AB: 5, BC: 12, MB: 12, NB: 15, NL: 15, NS: 14, NT: 5, NU: 5, ON: 13, PE: 15, QC: 14.975, SK: 11, YT: 5 };
  const FX: Record<string, { rate: number; round: number }> = { CAD: { rate: 1, round: 1 }, USD: { rate: 0.72, round: 1 }, NGN: { rate: 1100, round: 10000 } };
  const fx = (n: number, cur: string) => (cur === "CAD" ? n : Math.round((n * FX[cur].rate) / FX[cur].round) * FX[cur].round);

  type O = { c: number; items: [string, number][]; days: number; status: Prisma.OrderCreateInput["status"]; pay?: "PAID" | "FAILED" | "PENDING" };
  const plan: O[] = [
    { c: 0, items: [["RL-CK-OIL-237", 1], ["RL-CK-SCRUB-237", 1]], days: 44, status: "DELIVERED" },
    { c: 1, items: [["RL-PB-OIL-189", 2]], days: 38, status: "DELIVERED" },
    { c: 2, items: [["RL-VC-OIL-189", 1]], days: 33, status: "DELIVERED" },
    { c: 0, items: [["RL-GIFT-SIG-3", 1]], days: 27, status: "DELIVERED" },
    { c: 3, items: [["RL-CK-OIL-118", 2], ["RL-GLOW-100", 1]], days: 24, status: "DELIVERED" },
    { c: 4, items: [["RL-CK-OIL-189", 1]], days: 19, status: "DELIVERED" },
    { c: 1, items: [["RL-CK-OIL-237", 1], ["RL-BUTTER-VAN", 1]], days: 16, status: "DELIVERED" },
    { c: 5, items: [["RL-GLOW-100", 2]], days: 12, status: "SHIPPED" },
    { c: 2, items: [["RL-CK-OIL-118", 1], ["RL-CD-OIL-237", 1]], days: 9, status: "SHIPPED" },
    { c: 4, items: [["RL-PB-OIL-237", 1], ["RL-VC-OIL-237", 1]], days: 6, status: "OUT_FOR_DELIVERY" },
    { c: 3, items: [["RL-CK-SCRUB-500", 1]], days: 4, status: "READY_FOR_DELIVERY" },
    { c: 0, items: [["RL-PB-OIL-189", 1], ["RL-GLOW-100", 1]], days: 2, status: "PROCESSING" },
    { c: 5, items: [["RL-CK-OIL-237", 2]], days: 1, status: "PAYMENT_CONFIRMED" },
    { c: 1, items: [["RL-GIFT-SIG-3", 1]], days: 0, status: "PAYMENT_CONFIRMED" },
    { c: 2, items: [["RL-VV-OIL-237", 1]], days: 0, status: "PENDING", pay: "PENDING" },
    { c: 3, items: [["RL-CK-OIL-189", 1]], days: 5, status: "PENDING", pay: "FAILED" },
    { c: 4, items: [["RL-CD-OIL-237", 1]], days: 22, status: "CANCELLED", pay: "PAID" },
  ];

  let i = 0;
  for (const o of plan) {
    i++;
    const c = customers[o.c];
    const u = users[o.c];
    const zone = zoneFor(c.country);
    const cur = c.country === "NG" ? "NGN" : c.country === "US" ? "USD" : "CAD";
    const lines = o.items.map(([sku, qty]) => {
      const v = byS(sku);
      const unit = fx(v.salePrice && v.salePrice < v.price ? v.salePrice : v.price, cur);
      return { v, qty, unit };
    });
    const subtotal = lines.reduce((s, l) => s + l.unit * l.qty, 0);
    const shippingFee = zone.freeOverAmount && subtotal >= fx(zone.freeOverAmount, cur) ? 0 : fx(zone.fee, cur);
    const taxTotal = c.country === "CA" ? Math.round(((subtotal + shippingFee) * (TAX[c.state] ?? 0)) / 100) : 0;
    const total = subtotal + shippingFee + taxTotal;
    const paid = (o.pay ?? "PAID") === "PAID";
    const created = daysAgo(o.days, (i * 3) % 9);
    const order = await db.order.create({
      data: {
        orderNumber: `TMP-DEMO-${i}`,
        userId: u.id, customerName: c.name, email: c.email, phone: c.phone,
        addressLine1: c.line1, city: c.city, state: c.state, postalCode: c.postal || null, country: c.country,
        shippingZoneId: zone.id, shippingZoneName: zone.name, deliveryEstimate: zone.estimatedDelivery,
        subtotal, shippingFee, taxTotal, total, currency: cur, baseCurrency: "CAD", fxRate: FX[cur].rate,
        baseTotal: Math.round(total / FX[cur].rate), paymentProvider: cur === "NGN" ? "paystack" : "stripe",
        status: o.status, paymentStatus: o.pay ?? "PAID", paidAt: paid ? created : null,
        stockDeducted: false, // demo history: opening stock already reflects these sales
        isDemo: true, createdAt: created,
        items: {
          create: lines.map((l) => ({
            productId: l.v.productId, variantId: l.v.id, productName: l.v.product.name,
            variantName: l.v.name, sku: l.v.sku, imageUrl: l.v.imageUrl || l.v.product.images[0]?.url,
            unitPrice: l.unit, quantity: l.qty, lineTotal: l.unit * l.qty,
          })),
        },
        history: {
          create: [
            { status: "PENDING", note: "Order placed.", createdAt: created },
            ...(paid ? [{ status: "PAYMENT_CONFIRMED" as const, note: "Payment verified (demo).", createdAt: new Date(created.getTime() + 60000) }] : []),
            ...(o.status !== "PENDING" && o.status !== "PAYMENT_CONFIRMED" ? [{ status: o.status!, byName: "Rivkah", createdAt: new Date(created.getTime() + 86400000) }] : []),
          ],
        },
        payments: {
          create: {
            provider: cur === "NGN" ? "paystack" : "stripe", reference: `DEMO-${i}-${Date.now()}`, amount: total, currency: cur,
            status: o.pay ?? "PAID", channel: "card", gatewayResponse: paid ? "Approved (demo)" : o.pay === "FAILED" ? "Declined (demo)" : null,
            paidAt: paid ? created : null, createdAt: created,
          },
        },
      },
    });
    await db.order.update({ where: { id: order.id }, data: { orderNumber: `RL${10000 + order.number}` } });
    if (paid && o.status !== "CANCELLED") {
      for (const l of lines) {
        await db.productVariant.update({ where: { id: l.v.id }, data: { soldCount: { increment: l.qty } } });
      }
    }
  }
  // Roll variant sales up to products.
  const prods = await db.product.findMany({ include: { variants: true } });
  for (const p of prods) {
    await db.product.update({ where: { id: p.id }, data: { soldCount: p.variants.reduce((s, v) => s + v.soldCount, 0), viewCount: 20 + p.variants.reduce((s, v) => s + v.soldCount, 0) * 7 } });
  }

  // Reviews
  const pid = async (slug: string) => (await db.product.findUniqueOrThrow({ where: { slug } })).id;
  const reviews = [
    { slug: "cinnamon-kiss-body-oil", u: 0, rating: 5, title: "My signature scent now", comment: "The warmth of this oil is everything. It absorbs quickly and I get compliments every time I wear it.", featured: true, verified: true },
    { slug: "cinnamon-kiss-body-oil", u: 1, rating: 5, title: "Worth every penny", comment: "Skin feels so soft and the scent lasts. I've already reordered the big bottle.", verified: true },
    { slug: "cinnamon-kiss-body-oil", u: 3, rating: 4, title: "Lovely glow", comment: "Beautiful oil, not greasy at all. Would love an even bigger size!", verified: true },
    { slug: "peach-bloom-body-oil", u: 1, rating: 5, title: "Smells like summer", comment: "Fresh, light and so pretty. Perfect for daytime.", featured: true, verified: true },
    { slug: "peach-bloom-body-oil", u: 4, rating: 5, title: "Obsessed", comment: "The packaging alone made my day, and the oil is gorgeous.", verified: true },
    { slug: "vanilla-cashmere-body-oil", u: 2, rating: 5, title: "Cosy and elegant", comment: "Not too sweet, just soft and warm. My go-to for evenings.", featured: true, verified: true },
    { slug: "vanilla-cashmere-body-oil", u: 4, rating: 4, title: "Really nice", comment: "Lovely texture. Shipping to Abuja was quicker than I expected." },
    { slug: "glow-body-oil", u: 3, rating: 5, title: "Lightweight glow", comment: "I use it every morning after my shower. Light, hydrating and leaves a nice sheen.", verified: true },
    { slug: "glow-body-oil", u: 5, rating: 4, title: "Great everyday oil", comment: "Absorbs fast. I'd love it in a bigger bottle.", verified: true },
    { slug: "signature-gift-set", u: 0, rating: 5, title: "The perfect gift", comment: "Bought this for my sister's birthday — the black and gold box is stunning. She loved it.", featured: true, verified: true },
    { slug: "cinnamon-kiss-body-scrub", u: 0, rating: 5, title: "Smooth skin instantly", comment: "Pairs perfectly with the Cinnamon Kiss oil. My skin has never felt smoother.", verified: true },
    { slug: "whipped-body-butter", u: 1, rating: 5, title: "So rich", comment: "Melts into my skin, a little goes a long way.", verified: true },
    { slug: "cinnamon-delight-body-oil", u: 2, rating: 4, title: "Sweet and warm", comment: "A softer cinnamon than Cinnamon Kiss — I like both!", verified: true },
  ];
  for (const [n, r] of reviews.entries()) {
    const u = users[r.u];
    await db.review.create({
      data: {
        productId: await pid(r.slug), userId: u.id, name: u.name.split(" ")[0] + " " + u.name.split(" ")[1][0] + ".",
        email: u.email, location: customers[r.u].city, rating: r.rating, title: r.title, comment: r.comment,
        status: "APPROVED", isFeatured: !!r.featured, verifiedPurchase: !!r.verified, isDemo: true, createdAt: daysAgo(30 - n * 2),
      },
    });
  }
  // Pending reviews so the approval flow can be tried.
  await db.review.create({
    data: { productId: await pid("peach-bloom-body-oil"), name: "Ifeoma N.", email: "ifeoma@example.com", location: "Lagos", rating: 5, title: "New favourite", comment: "Just got mine and I'm in love with the scent.", status: "PENDING", isDemo: true },
  });
  await db.review.create({
    data: { productId: await pid("vanilla-velvet-body-oil"), name: "Blessing A.", email: "blessing@example.com", rating: 4, title: "Rich vanilla", comment: "Beautiful, deep vanilla. Will update after a few weeks.", status: "PENDING", isDemo: true },
  });
  for (const p of await db.product.findMany({ select: { id: true } })) {
    const agg = await db.review.aggregate({ where: { productId: p.id, status: "APPROVED" }, _avg: { rating: true }, _count: true });
    await db.product.update({ where: { id: p.id }, data: { ratingAvg: Math.round((agg._avg.rating ?? 0) * 10) / 10, reviewCount: agg._count } });
  }

  // Coupons
  const giftCat = await db.category.findUniqueOrThrow({ where: { slug: "gift-sets" } });
  await db.coupon.createMany({
    data: [
      { code: "WELCOME10", description: "10% off your first order", type: "PERCENTAGE", value: 10, firstOrderOnly: true, usageLimitPerCustomer: 1, isDemo: true },
      { code: "FREESHIP", description: "Free shipping on orders over $50", type: "FREE_SHIPPING", value: 0, minOrderAmount: C(50), isDemo: true },
      { code: "GLOW10", description: "$10 off orders over $80", type: "FIXED", value: C(10), minOrderAmount: C(80), endsAt: new Date(Date.now() + 30 * 86400000), usageLimit: 100, isDemo: true },
    ],
  });
  await db.coupon.create({
    data: { code: "GIFTSET15", description: "15% off gift sets", type: "PERCENTAGE", value: 15, categories: { connect: { id: giftCat.id } }, endsAt: new Date(Date.now() + 45 * 86400000), isDemo: true },
  });

  const valentine = await db.collection.findUniqueOrThrow({ where: { slug: "valentines-edit" } });
  await db.promotion.create({
    data: {
      name: "Valentine's Edit", headline: "The Valentine's Edit", subheading: "Warm, romantic scents wrapped in black and gold. Use code GIFTSET15 for 15% off gift sets.",
      imageUrl: "/demo/hero-packaging.webp", ctaText: "Shop the Edit", ctaLink: "/collections/valentines-edit", discountText: "15% off gift sets",
      collectionId: valentine.id, showAsBanner: true, showAsHero: false, startsAt: daysAgo(2), endsAt: new Date(Date.now() + 40 * 86400000), isDemo: true,
    },
  });

  await db.newsletterSubscriber.createMany({
    data: ["amara.o@example.com", "chloe@example.com", "ngozi@example.com", "amara@example.com", "kemi@example.com"].map((email, n) => ({
      email, source: n < 2 ? "checkout" : "homepage", isDemo: true, createdAt: daysAgo(40 - n * 7),
    })),
  });
  await db.contactMessage.createMany({
    data: [
      { name: "Ngozi Bello", email: "ngozi@example.com", phone: "+1 613 555 0109", subject: "Wholesale enquiry", message: "Hello! I own a small boutique in Ottawa and would love to stock your body oils. Do you offer wholesale prices?", isDemo: true, createdAt: daysAgo(1) },
      { name: "Amara Obi", email: "amara@example.com", subject: "Gift message", message: "Can I add a handwritten note to a gift set order?", status: "RESOLVED", isDemo: true, createdAt: daysAgo(8) },
    ],
  });

  // An abandoned bag (has items, never checked out).
  const v1 = byS("RL-PB-OIL-237");
  const v2 = byS("RL-GLOW-100");
  await db.cart.create({
    data: {
      token: `demo-abandoned-${Date.now()}`, email: "kemi@example.com", updatedAt: daysAgo(2), createdAt: daysAgo(2),
      items: { create: [{ variantId: v1.id, quantity: 1 }, { variantId: v2.id, quantity: 1 }] },
    },
  });

  await db.notification.createMany({
    data: [
      { type: "NEW_REVIEW", title: "New review waiting for approval", body: "Ifeoma N. reviewed Peach Bloom Moisturizing Body Oil", link: "/admin/reviews" },
      { type: "LOW_STOCK", title: "Whipped Body Butter (Vanilla) is running low", body: "3 left (alert at 5).", link: "/admin/inventory" },
      { type: "OUT_OF_STOCK", title: "Whipped Body Butter (Cinnamon) is out of stock", body: "0 left.", link: "/admin/inventory" },
    ],
  });
  console.log("✓ Demo customers, orders, reviews, coupons, promotion, subscribers, messages");
}

async function main() {
  await seedOwner();
  await seedConfig();
  await seedCatalogue();
  await seedPeopleAndOrders();
}

main()
  .then(() => console.log("Seed complete."))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
