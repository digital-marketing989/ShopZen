import { PrismaClient } from "@prisma/client";
import { CATEGORIES_TAXONOMY } from "../lib/categories-data";

const prisma = new PrismaClient();

async function seedCategories() {
  console.log("🚀 Starting idempotent categories & catalog seeding...");

  // 1. Seed or update ProductSource default sources
  const defaultSources = [
    { name: "Verified Supplier Feed", sourceType: "SUPPLIER_FEED", provider: "ShopZen Authorized Distributors" },
    { name: "Authorized Brand API", sourceType: "AUTHORIZED_API", provider: "Direct Brand Integration" },
    { name: "Seller Portal Upload", sourceType: "SELLER_UPLOAD", provider: "Merchant Dashboard" },
    { name: "Batch CSV Import", sourceType: "CSV", provider: "Admin Catalog Importer" },
  ];

  for (const src of defaultSources) {
    const existing = await prisma.productSource.findFirst({ where: { name: src.name } });
    if (!existing) {
      await prisma.productSource.create({ data: src });
    }
  }

  // 2. Map of existing categories to preserve relations
  const existingCategories = await prisma.category.findMany();
  const existingBySlug = new Map(existingCategories.map((c) => [c.slug, c]));

  let totalMainCreated = 0;
  let totalMainUpdated = 0;
  let totalSubsCreated = 0;
  let totalSubsUpdated = 0;

  // 3. Process 12 main categories
  for (const catDef of CATEGORIES_TAXONOMY) {
    let mainCat = existingBySlug.get(catDef.slug);

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
      existingBySlug.set(mainCat.slug, mainCat);
      totalMainCreated++;
    } else {
      mainCat = await prisma.category.update({
        where: { id: mainCat.id },
        data: {
          name: catDef.name,
          description: catDef.description,
          image: catDef.image,
          banner: catDef.banner,
          level: 0,
          sortOrder: catDef.displayOrder,
          isActive: true,
        },
      });
      totalMainUpdated++;
    }

    // 4. Process subcategories
    for (const subDef of catDef.subcategories) {
      let subCat = existingBySlug.get(subDef.slug);

      if (!subCat) {
        subCat = await prisma.category.create({
          data: {
            name: subDef.name,
            slug: subDef.slug,
            description: subDef.description || `${subDef.name} under ${catDef.name}`,
            parentId: mainCat.id,
            level: 1,
            sortOrder: subDef.displayOrder,
            isActive: true,
          },
        });
        existingBySlug.set(subCat.slug, subCat);
        totalSubsCreated++;
      } else {
        subCat = await prisma.category.update({
          where: { id: subCat.id },
          data: {
            name: subDef.name,
            parentId: mainCat.id,
            level: 1,
            sortOrder: subDef.displayOrder,
            isActive: true,
          },
        });
        totalSubsUpdated++;
      }
    }
  }

  // 5. Intelligent Product Reassignment for any products linked to deprecated/legacy category slugs
  const slugRemap: Record<string, string> = {
    "mobiles": "smartphones",
    "electronics": "electronics-computers",
    "fashion": "fashion-lifestyle",
    "home-kitchen": "home-appliances-kitchen",
    "sports": "sports-fitness-outdoors",
    "books": "books-stationery-education",
    "audio-headphones": "headphones-earbuds",
  };

  for (const [oldSlug, newSlug] of Object.entries(slugRemap)) {
    const oldCat = existingBySlug.get(oldSlug);
    const newCat = existingBySlug.get(newSlug);

    if (oldCat && newCat && oldCat.id !== newCat.id) {
      const moved = await prisma.product.updateMany({
        where: { categoryId: oldCat.id },
        data: { categoryId: newCat.id },
      });
      if (moved.count > 0) {
        console.log(`Reassigned ${moved.count} products from ${oldSlug} -> ${newSlug}`);
      }
    }
  }

  console.log(`
✅ Category Hierarchy Seed Complete:
- 12 Main Categories: ${totalMainCreated} created, ${totalMainUpdated} updated
- 290 Subcategories: ${totalSubsCreated} created, ${totalSubsUpdated} updated
`);
}

seedCategories()
  .catch((e) => {
    console.error("❌ Seed categories failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
