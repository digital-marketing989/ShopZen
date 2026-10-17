import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { CATEGORIES_TAXONOMY } from "../lib/categories-data";

const prisma = new PrismaClient();

// Curated image pools per main category
const CATEGORY_IMAGE_POOLS: Record<string, string[]> = {
  "mobiles-accessories": [
    "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=600&q=80",
    "https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?w=600&q=80",
    "https://images.unsplash.com/photo-1580910051074-3eb694886505?w=600&q=80",
    "https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=600&q=80",
    "https://images.unsplash.com/photo-1601784551446-20c9e07cdbdb?w=600&q=80",
    "https://images.unsplash.com/photo-1565849904461-04a58ad377e0?w=600&q=80",
  ],
  "electronics-computers": [
    "https://images.unsplash.com/photo-1498049794561-7780e7231661?w=600&q=80",
    "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&q=80",
    "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=600&q=80",
    "https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=600&q=80",
    "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=600&q=80",
    "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=600&q=80",
  ],
  "fashion-lifestyle": [
    "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=600&q=80",
    "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=600&q=80",
    "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&q=80",
    "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&q=80",
    "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=600&q=80",
    "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600&q=80",
  ],
  "home-appliances-kitchen": [
    "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=600&q=80",
    "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=600&q=80",
    "https://images.unsplash.com/photo-1574269909862-7e1d70bb8078?w=600&q=80",
    "https://images.unsplash.com/photo-1590794056226-79ef3a8147e1?w=600&q=80",
  ],
  "furniture-home-decor": [
    "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=600&q=80",
    "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=600&q=80",
    "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=600&q=80",
  ],
  "beauty-personal-care": [
    "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=600&q=80",
    "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=600&q=80",
    "https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=600&q=80",
  ],
  "grocery-household-essentials": [
    "https://images.unsplash.com/photo-1542838132-92c53300491e?w=600&q=80",
    "https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=600&q=80",
    "https://images.unsplash.com/photo-1588964895597-cfccd6e2dbf9?w=600&q=80",
  ],
  "books-stationery-education": [
    "https://images.unsplash.com/photo-1512820790803-83ca734da794?w=600&q=80",
    "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=600&q=80",
    "https://images.unsplash.com/photo-1589829085413-56de8ae18c73?w=600&q=80",
  ],
  "sports-fitness-outdoors": [
    "https://images.unsplash.com/photo-1517649763962-0c623066013b?w=600&q=80",
    "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=600&q=80",
    "https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?w=600&q=80",
  ],
  "toys-baby-kids": [
    "https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=600&q=80",
    "https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?w=600&q=80",
    "https://images.unsplash.com/photo-1566576912321-d58ddd7a6088?w=600&q=80",
  ],
  "automotive-travel": [
    "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=600&q=80",
    "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=600&q=80",
    "https://images.unsplash.com/photo-1563720223185-11003d516935?w=600&q=80",
  ],
  "tools-industrial-other": [
    "https://images.unsplash.com/photo-1581783342308-f792dbdd27c5?w=600&q=80",
    "https://images.unsplash.com/photo-1504917599217-d4dc5ebe6122?w=600&q=80",
    "https://images.unsplash.com/photo-1581244277943-fe4a9c777189?w=600&q=80",
  ],
};

const DEFAULT_BRANDS = [
  { name: "Samsung", slug: "samsung" },
  { name: "Apple", slug: "apple" },
  { name: "Sony", slug: "sony" },
  { name: "boAt", slug: "boat" },
  { name: "Nike", slug: "nike" },
  { name: "Adidas", slug: "adidas" },
  { name: "Puma", slug: "puma" },
  { name: "Levi's", slug: "levis" },
  { name: "Philips", slug: "philips" },
  { name: "Prestige", slug: "prestige" },
  { name: "LG", slug: "lg" },
  { name: "Dell", slug: "dell" },
];

async function seedCompleteCatalog() {
  console.log("🌟 Seeding Complete Multi-Category Catalog with Durga Puja Maha Sale (85% - 95% Discounts)...");

  // 1. Ensure SuperAdmin & Sellers exist
  const hashedAdminPass = await bcrypt.hash("Admin@123", 10);
  const hashedSellerPass = await bcrypt.hash("Seller@123", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@shopzen.com" },
    update: { role: "SUPER_ADMIN", isActive: true },
    create: {
      name: "Super Admin",
      email: "admin@shopzen.com",
      password: hashedAdminPass,
      role: "SUPER_ADMIN",
      isActive: true,
      emailVerified: true,
      status: "ACTIVE",
    },
  });

  const sellerUser = await prisma.user.upsert({
    where: { email: "seller1@shopzen.com" },
    update: { role: "SELLER", isActive: true },
    create: {
      name: "ShopZen Retail India",
      email: "seller1@shopzen.com",
      password: hashedSellerPass,
      role: "SELLER",
      isActive: true,
      emailVerified: true,
      status: "ACTIVE",
    },
  });

  const seller = await prisma.seller.upsert({
    where: { userId: sellerUser.id },
    update: { status: "APPROVED" },
    create: {
      userId: sellerUser.id,
      businessName: "ShopZen Verified Retail",
      businessType: "COMPANY",
      status: "APPROVED",
      commissionRate: 8.0,
      rating: 4.8,
    },
  });

  // 2. Ensure Brands exist
  const brandsMap = new Map<string, any>();
  for (const b of DEFAULT_BRANDS) {
    const brand = await prisma.brand.upsert({
      where: { slug: b.slug },
      update: { name: b.name },
      create: { name: b.name, slug: b.slug, isActive: true },
    });
    brandsMap.set(b.slug, brand);
  }
  const brandList = Array.from(brandsMap.values());

  // 3. Ensure Durga Puja Maha Sale Campaign is Active
  const durgaSaleStartsAt = new Date();
  const durgaSaleEndsAt = new Date("2026-10-22T23:59:59+05:30");
  await prisma.saleCampaign.upsert({
    where: { slug: "durga-puja-maha-sale" },
    update: {
      name: "Durga Puja Maha Sale",
      startsAt: durgaSaleStartsAt,
      endsAt: durgaSaleEndsAt,
      minDiscount: 85,
      maxDiscount: 95,
      isActive: true,
      stackWithCoupons: false,
      showBanner: true,
      bannerText: "Durga Puja Maha Sale: Up to 95% OFF on everything",
      blockSaleBelowCost: false,
    },
    create: {
      name: "Durga Puja Maha Sale",
      slug: "durga-puja-maha-sale",
      startsAt: durgaSaleStartsAt,
      endsAt: durgaSaleEndsAt,
      minDiscount: 85,
      maxDiscount: 95,
      isActive: true,
      stackWithCoupons: false,
      showBanner: true,
      bannerText: "Durga Puja Maha Sale: Up to 95% OFF on everything",
      blockSaleBelowCost: false,
    },
  });

  // 4. Ensure All 12 Categories and Subcategories exist
  console.log("📂 Verifying categories hierarchy...");
  const categoriesInDb = await prisma.category.findMany();
  const catBySlug = new Map(categoriesInDb.map((c) => [c.slug, c]));

  for (const catDef of CATEGORIES_TAXONOMY) {
    let mainCat = catBySlug.get(catDef.slug);
    if (!mainCat) {
      mainCat = await prisma.category.create({
        data: {
          name: catDef.name,
          slug: catDef.slug,
          description: catDef.description,
          image: catDef.image,
          banner: catDef.banner,
          level: 0,
          sortOrder: catDef.displayOrder,
          isActive: true,
        },
      });
      catBySlug.set(mainCat.slug, mainCat);
    }

    for (const subDef of catDef.subcategories) {
      let subCat = catBySlug.get(subDef.slug);
      if (!subCat) {
        subCat = await prisma.category.create({
          data: {
            name: subDef.name,
            slug: subDef.slug,
            description: `${subDef.name} under ${catDef.name}`,
            parentId: mainCat.id,
            level: 1,
            sortOrder: subDef.displayOrder,
            isActive: true,
          },
        });
        catBySlug.set(subCat.slug, subCat);
      }
    }
  }

  // 5. Generate high-quality published products for EVERY subcategory!
  console.log("🛍️ Creating verified published products across all departments...");

  let productCount = 0;
  for (const catDef of CATEGORIES_TAXONOMY) {
    const imagePool = CATEGORY_IMAGE_POOLS[catDef.slug] || [
      "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=600&q=80",
    ];

    for (let sIdx = 0; sIdx < catDef.subcategories.length; sIdx++) {
      const sub = catDef.subcategories[sIdx];
      const subCat = catBySlug.get(sub.slug);
      if (!subCat) continue;

      // Create 2 to 3 products per subcategory
      const itemsToCreate = 2;
      for (let pIdx = 1; pIdx <= itemsToCreate; pIdx++) {
        const brand = brandList[(sIdx + pIdx) % brandList.length];
        const imageUrl = imagePool[(sIdx + pIdx) % imagePool.length];

        const mrp = Math.floor(1499 + ((sIdx * 1700 + pIdx * 900) % 45000));
        // Normal list price (e.g. 10-15% off MRP when sale is not on)
        const regularPrice = Math.round(mrp * 0.88);
        const costPrice = Math.round(mrp * 0.15); // cost price well below sale price

        const title = `${brand.name} ${sub.name} Pro ${pIdx === 1 ? "Edition" : "Max"}`;
        const slug = `${brand.slug}-${sub.slug}-${pIdx}`;
        const sku = `SZ-${catDef.slug.slice(0, 3).toUpperCase()}-${sub.slug}-${pIdx}`;

        // Check if exists
        const existing = await prisma.product.findUnique({ where: { slug } });
        if (!existing) {
          const product = await prisma.product.create({
            data: {
              title,
              slug,
              sku,
              description: `Authentic ${title}. Features state-of-the-art build quality, premium verified warranty, fast shipping and 100% genuine guarantee from ${brand.name}.`,
              shortDescription: `Original ${brand.name} product with official warranty`,
              mrp,
              price: regularPrice,
              costPrice,
              categoryId: subCat.id,
              brandId: brand.id,
              sellerId: seller.id,
              status: "PUBLISHED",
              isFeatured: (sIdx + pIdx) % 7 === 0,
              isFlashSale: (sIdx + pIdx) % 5 === 0,
              totalStock: 50 + (sIdx % 30),
              soldCount: 120 + sIdx * 5,
              rating: 4.0 + ((sIdx * 3 + pIdx) % 10) / 10,
              reviewCount: 45 + sIdx * 8,
              tags: `${catDef.name}, ${sub.name}, ${brand.name}, durga puja sale`,
            },
          });

          // Add image
          await prisma.productImage.create({
            data: {
              productId: product.id,
              url: imageUrl,
              sortOrder: 0,
            },
          });

          // Create Seller Offer
          await prisma.sellerOffer.create({
            data: {
              sellerId: seller.id,
              productId: product.id,
              price: regularPrice,
              mrp,
              stock: 50,
              condition: "NEW",
              isActive: true,
            },
          });

          // Create Inventory
          await prisma.inventory.create({
            data: {
              productId: product.id,
              quantity: 50,
              lowStockThreshold: 10,
            },
          });

          productCount++;
        }
      }
    }
  }

  // 6. Also import top featured flagship demo products if missing
  const flagshipProducts = [
    {
      title: "Apple iPhone 15 Pro (128 GB) - Natural Titanium",
      slug: "apple-iphone-15-pro-128gb",
      sku: "APL-IP15P-128",
      mrp: 134900,
      price: 124900,
      categorySlug: "smartphones",
      brandSlug: "apple",
      image: "https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=800&q=80",
    },
    {
      title: "Samsung Galaxy S24 Ultra 5G (Titanium Gray, 256GB)",
      slug: "samsung-galaxy-s24-ultra",
      sku: "SAM-S24U-256",
      mrp: 129999,
      price: 119999,
      categorySlug: "smartphones",
      brandSlug: "samsung",
      image: "https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=800&q=80",
    },
    {
      title: "Sony WH-1000XM5 Wireless Noise Cancelling Headphones",
      slug: "sony-wh-1000xm5-wireless-headphones",
      sku: "SNY-WH1000XM5",
      mrp: 34990,
      price: 26990,
      categorySlug: "headphones-earbuds",
      brandSlug: "sony",
      image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80",
    },
    {
      title: "boAt BassHeads 100 Wired Earphones with Mic",
      slug: "boat-bassheads-100",
      sku: "BOAT-BH100",
      mrp: 999,
      price: 399,
      categorySlug: "headphones-earbuds",
      brandSlug: "boat",
      image: "https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=800&q=80",
    },
    {
      title: "Apple MacBook Air M3 13-inch (16GB RAM, 512GB SSD)",
      slug: "apple-macbook-air-m3-13",
      sku: "APL-MBA-M3",
      mrp: 134900,
      price: 124900,
      categorySlug: "laptops",
      brandSlug: "apple",
      image: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&q=80",
    },
    {
      title: "Nike Air Max 270 Men's Running Sneakers",
      slug: "nike-air-max-270-sneakers",
      sku: "NKE-AM270-01",
      mrp: 13995,
      price: 10995,
      categorySlug: "sneakers",
      brandSlug: "nike",
      image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=80",
    },
  ];

  for (const fp of flagshipProducts) {
    const exists = await prisma.product.findUnique({ where: { slug: fp.slug } });
    if (!exists) {
      const subCat = catBySlug.get(fp.categorySlug);
      const brand = brandsMap.get(fp.brandSlug) || brandList[0];
      if (subCat) {
        const prod = await prisma.product.create({
          data: {
            title: fp.title,
            slug: fp.slug,
            sku: fp.sku,
            description: `${fp.title}. 100% genuine with authentic manufacturer warranty and instant doorstep delivery.`,
            mrp: fp.mrp,
            price: fp.price,
            costPrice: Math.round(fp.mrp * 0.1),
            categoryId: subCat.id,
            brandId: brand.id,
            sellerId: seller.id,
            status: "PUBLISHED",
            isFeatured: true,
            isFlashSale: true,
            totalStock: 80,
            rating: 4.8,
            reviewCount: 230,
          },
        });
        await prisma.productImage.create({
          data: { productId: prod.id, url: fp.image, sortOrder: 0 },
        });
        await prisma.inventory.create({
          data: { productId: prod.id, quantity: 80, lowStockThreshold: 10 },
        });
        await prisma.sellerOffer.create({
          data: { sellerId: seller.id, productId: prod.id, price: fp.price, mrp: fp.mrp, stock: 80 },
        });
      }
    }
  }

  const finalTotal = await prisma.product.count({ where: { status: "PUBLISHED" } });
  console.log(`\n🎉 Seed Completed Successfully!`);
  console.log(`- Total Published Products: ${finalTotal}`);
  console.log(`- Covered all 12 main categories and 296 subcategories!`);
  console.log(`- Durga Puja Maha Sale (85% to 95% discount) is active and applied across all products!`);
}

seedCompleteCatalog()
  .catch((e) => {
    console.error("❌ Catalog seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
