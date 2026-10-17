import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user) return null;
  const role = (session.user as any).role;
  if (role !== "ADMIN" && role !== "SUPER_ADMIN") return null;
  return session;
}

// GET: Fetch past ProductImportJob history
export async function GET() {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const jobs = await db.productImportJob.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
    });
    return NextResponse.json({ success: true, data: jobs });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to fetch import jobs" }, { status: 500 });
  }
}

// POST: Execute bulk product import from CSV
export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { csvText, fileName = "catalog_import.csv", sourceName = "Batch CSV Import" } = body;

    if (!csvText || !csvText.trim()) {
      return NextResponse.json({ error: "CSV data is required" }, { status: 400 });
    }

    // Get or create product source
    let source = await db.productSource.findFirst({ where: { name: sourceName } });
    if (!source) {
      source = await db.productSource.create({
        data: { name: sourceName, sourceType: "CSV", provider: "Admin Portal" },
      });
    }

    // Create import job record
    const job = await db.productImportJob.create({
      data: {
        fileName,
        sourceId: source.id,
        status: "PROCESSING",
        createdById: session.user.id,
      },
    });

    const lines = csvText.split(/\r?\n/).filter((line: string) => line.trim().length > 0);
    if (lines.length < 2) {
      await db.productImportJob.update({
        where: { id: job.id },
        data: { status: "FAILED", errorReport: JSON.stringify([{ row: 0, error: "Empty or invalid CSV file" }]) },
      });
      return NextResponse.json({ error: "CSV must contain a header and at least one data row" }, { status: 400 });
    }

    // Parse simple CSV line
    const parseLine = (text: string) => {
      const result: string[] = [];
      let cur = "";
      let inQuotes = false;
      for (let i = 0; i < text.length; i++) {
        const char = text[i];
        if (char === '"') {
          if (inQuotes && text[i + 1] === '"') {
            cur += '"';
            i++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (char === "," && !inQuotes) {
          result.push(cur.trim());
          cur = "";
        } else {
          cur += char;
        }
      }
      result.push(cur.trim());
      return result;
    };

    const header = parseLine(lines[0]).map((h) => h.toLowerCase().replace(/[^a-z0-9]/g, ""));
    const titleIdx = header.findIndex((h) => h.includes("title") || h.includes("name"));
    const mrpIdx = header.findIndex((h) => h.includes("mrp"));
    const priceIdx = header.findIndex((h) => h === "price" || h.includes("saleprice"));
    const costIdx = header.findIndex((h) => h.includes("cost"));
    const catIdx = header.findIndex((h) => h.includes("category"));
    const brandIdx = header.findIndex((h) => h.includes("brand"));
    const skuIdx = header.findIndex((h) => h.includes("sku"));
    const descIdx = header.findIndex((h) => h.includes("desc"));
    const stockIdx = header.findIndex((h) => h.includes("stock") || h.includes("qty"));
    const imageIdx = header.findIndex((h) => h.includes("image") || h.includes("photo"));
    const tagsIdx = header.findIndex((h) => h.includes("tag"));

    if (titleIdx === -1 || (mrpIdx === -1 && priceIdx === -1)) {
      await db.productImportJob.update({
        where: { id: job.id },
        data: { status: "FAILED", errorReport: JSON.stringify([{ row: 1, error: "Header missing required Title or Price columns" }]) },
      });
      return NextResponse.json({ error: 'Missing required columns: "Title" and "Price" or "MRP"' }, { status: 400 });
    }

    // Pre-cache categories and brands for high-speed batch matching
    const allCategories = await db.category.findMany({ select: { id: true, name: true, slug: true } });
    const catBySlug = new Map(allCategories.map((c) => [c.slug.toLowerCase(), c]));
    const catByName = new Map(allCategories.map((c) => [c.name.toLowerCase(), c]));
    const catById = new Map(allCategories.map((c) => [c.id, c]));

    const allBrands = await db.brand.findMany({ select: { id: true, name: true, slug: true } });
    const brandByName = new Map(allBrands.map((b) => [b.name.toLowerCase(), b]));
    const brandBySlug = new Map(allBrands.map((b) => [b.slug.toLowerCase(), b]));

    // Default category fallback if none matches
    const defaultCat = allCategories[0] || (await db.category.create({ data: { name: "General", slug: "general", level: 0 } }));

    const totalRows = lines.length - 1;
    let successfulRows = 0;
    let failedRows = 0;
    const failedReport: Array<{ row: number; title?: string; error: string }> = [];

    // Process in batches
    for (let i = 1; i < lines.length; i++) {
      const rowNum = i + 1;
      const cols = parseLine(lines[i]);
      if (cols.length === 0 || cols.every((c) => !c)) continue;

      const title = cols[titleIdx]?.trim();
      if (!title) {
        failedRows++;
        failedReport.push({ row: rowNum, error: "Product title is empty" });
        continue;
      }

      const rawMrp = mrpIdx !== -1 ? parseFloat(cols[mrpIdx]?.replace(/[^0-9.]/g, "")) : NaN;
      const rawPrice = priceIdx !== -1 ? parseFloat(cols[priceIdx]?.replace(/[^0-9.]/g, "")) : NaN;
      const mrp = !isNaN(rawMrp) ? rawMrp : !isNaN(rawPrice) ? rawPrice : 0;
      const price = !isNaN(rawPrice) ? rawPrice : mrp;

      if (mrp <= 0 || price <= 0) {
        failedRows++;
        failedReport.push({ row: rowNum, title, error: "Invalid price or MRP (must be > 0)" });
        continue;
      }

      const costPrice = costIdx !== -1 && !isNaN(parseFloat(cols[costIdx])) ? parseFloat(cols[costIdx]) : null;
      const stock = stockIdx !== -1 && !isNaN(parseInt(cols[stockIdx])) ? parseInt(cols[stockIdx]) : 10;
      const description = descIdx !== -1 ? cols[descIdx] : "";
      const rawCategory = catIdx !== -1 ? cols[catIdx]?.trim().toLowerCase() : "";
      const rawBrand = brandIdx !== -1 ? cols[brandIdx]?.trim() : "";
      const sku = skuIdx !== -1 && cols[skuIdx]?.trim() ? cols[skuIdx].trim() : `SKU-${Date.now()}-${i}`;
      const image = imageIdx !== -1 ? cols[imageIdx]?.trim() : null;
      const tags = tagsIdx !== -1 ? cols[tagsIdx]?.trim() : null;

      // Category matching by ID, slug, or name
      const matchedCategory =
        catById.get(rawCategory) ||
        catBySlug.get(rawCategory) ||
        catByName.get(rawCategory) ||
        defaultCat;

      // Brand matching or creation
      let matchedBrandId: string | null = null;
      if (rawBrand) {
        const lowerBrand = rawBrand.toLowerCase();
        let b = brandByName.get(lowerBrand) || brandBySlug.get(lowerBrand);
        if (!b) {
          try {
            const newBrandSlug = lowerBrand.replace(/[^a-z0-9]+/g, "-");
            b = await db.brand.create({
              data: { name: rawBrand, slug: newBrandSlug },
            });
            brandByName.set(lowerBrand, b);
            brandBySlug.set(b.slug, b);
          } catch {}
        }
        if (b) matchedBrandId = b.id;
      }

      // Generate unique slug
      const baseSlug = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)+/g, "")
        .slice(0, 80);
      const uniqueSlug = `${baseSlug}-${Math.random().toString(36).substring(2, 7)}`;

      try {
        // Duplicate detection: check if SKU exists
        const existingBySku = await db.product.findUnique({ where: { sku } });
        if (existingBySku) {
          // Idempotent update
          await db.product.update({
            where: { id: existingBySku.id },
            data: {
              title,
              description: description || existingBySku.description,
              mrp,
              price,
              costPrice: costPrice !== null ? costPrice : existingBySku.costPrice,
              categoryId: matchedCategory.id,
              brandId: matchedBrandId || existingBySku.brandId,
              totalStock: stock,
              tags: tags || existingBySku.tags,
              // Keep in DRAFT or preserve existing
              sourceId: source.id,
            },
          });
          successfulRows++;
          continue;
        }

        // Create new product in DRAFT status as specified in requirements
        const createdProduct = await db.product.create({
          data: {
            title,
            slug: uniqueSlug,
            sku,
            description,
            mrp,
            price,
            costPrice,
            categoryId: matchedCategory.id,
            brandId: matchedBrandId,
            totalStock: stock,
            tags,
            status: "DRAFT", // strictly kept in DRAFT until reviewed
            sourceId: source.id,
          },
        });

        if (image) {
          await db.productImage.create({
            data: {
              productId: createdProduct.id,
              url: image,
              sortOrder: 0,
            },
          });
        }

        successfulRows++;
      } catch (err: any) {
        failedRows++;
        failedReport.push({ row: rowNum, title, error: err.message || "Database insert error" });
      }
    }

    // Update import job status
    const finalStatus =
      failedRows === 0 ? "COMPLETED" : successfulRows > 0 ? "COMPLETED_WITH_ERRORS" : "FAILED";

    await db.productImportJob.update({
      where: { id: job.id },
      data: {
        status: finalStatus,
        totalRows,
        processedRows: successfulRows + failedRows,
        successfulRows,
        failedRows,
        errorReport: failedReport.length > 0 ? JSON.stringify(failedReport) : null,
        completedAt: new Date(),
      },
    });

    try {
      await db.auditLog.create({
        data: {
          userId: session.user.id,
          action: "IMPORT_PRODUCTS_CSV",
          resource: "ProductImportJob",
          recordId: job.id,
          details: JSON.stringify({ fileName, totalRows, successfulRows, failedRows }),
        },
      });
    } catch {}

    return NextResponse.json({
      success: true,
      jobId: job.id,
      status: finalStatus,
      totalRows,
      successfulRows,
      failedRows,
      errors: failedReport,
      message: `Batch import completed: ${successfulRows} products imported to DRAFT, ${failedRows} failed.`,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Bulk import failed" }, { status: 500 });
  }
}
