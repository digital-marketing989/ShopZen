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

// GET: Export categories hierarchy to CSV
export async function GET() {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const categories = await db.category.findMany({
      include: {
        parent: { select: { slug: true } },
      },
      orderBy: [{ level: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
    });

    const headers = [
      "name",
      "slug",
      "parentSlug",
      "level",
      "sortOrder",
      "isActive",
      "description",
      "image",
      "banner",
    ];

    const escapeCsv = (val: any) => {
      if (val === null || val === undefined) return "";
      const str = String(val).replace(/"/g, '""');
      if (str.includes(",") || str.includes('"') || str.includes("\n")) {
        return `"${str}"`;
      }
      return str;
    };

    const rows = categories.map((c) => [
      escapeCsv(c.name),
      escapeCsv(c.slug),
      escapeCsv(c.parent?.slug || ""),
      c.level,
      c.sortOrder,
      c.isActive ? "true" : "false",
      escapeCsv(c.description || ""),
      escapeCsv(c.image || ""),
      escapeCsv(c.banner || ""),
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename=shopzen_categories_${Date.now()}.csv`,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to export CSV" }, { status: 500 });
  }
}

// POST: Import categories hierarchy from CSV
export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const csvText: string = body.csvText || "";

    if (!csvText.trim()) {
      return NextResponse.json({ error: "CSV text is required" }, { status: 400 });
    }

    const lines = csvText.split(/\r?\n/).filter((line) => line.trim().length > 0);
    if (lines.length < 2) {
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

    const header = parseLine(lines[0]).map((h) => h.toLowerCase());
    const nameIdx = header.indexOf("name");
    const slugIdx = header.indexOf("slug");
    const parentSlugIdx = header.indexOf("parentslug");
    const sortOrderIdx = header.indexOf("sortorder");
    const isActiveIdx = header.indexOf("isactive");
    const descIdx = header.indexOf("description");
    const imageIdx = header.indexOf("image");
    const bannerIdx = header.indexOf("banner");

    if (nameIdx === -1) {
      return NextResponse.json({ error: 'Missing required "name" column in CSV header' }, { status: 400 });
    }

    let createdCount = 0;
    let updatedCount = 0;
    const errors: string[] = [];

    // Two pass import: first pass creates/updates without parentId, second pass links parentId
    const parsedRows = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = parseLine(lines[i]);
      const name = cols[nameIdx];
      if (!name) continue;

      const slug = slugIdx !== -1 && cols[slugIdx] ? cols[slugIdx] : name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "");
      const parentSlug = parentSlugIdx !== -1 ? cols[parentSlugIdx] : "";
      const sortOrder = sortOrderIdx !== -1 && !isNaN(Number(cols[sortOrderIdx])) ? Number(cols[sortOrderIdx]) : 0;
      const isActive = isActiveIdx !== -1 ? cols[isActiveIdx] !== "false" : true;
      const description = descIdx !== -1 ? cols[descIdx] : "";
      const image = imageIdx !== -1 ? cols[imageIdx] : null;
      const banner = bannerIdx !== -1 ? cols[bannerIdx] : null;

      parsedRows.push({ name, slug, parentSlug, sortOrder, isActive, description, image, banner, rowNum: i + 1 });
    }

    // 1st pass: upsert categories
    for (const row of parsedRows) {
      try {
        const existing = await db.category.findUnique({ where: { slug: row.slug } });
        if (existing) {
          await db.category.update({
            where: { id: existing.id },
            data: {
              name: row.name,
              description: row.description || existing.description,
              image: row.image || existing.image,
              banner: row.banner || existing.banner,
              sortOrder: row.sortOrder,
              isActive: row.isActive,
            },
          });
          updatedCount++;
        } else {
          await db.category.create({
            data: {
              name: row.name,
              slug: row.slug,
              description: row.description,
              image: row.image,
              banner: row.banner,
              sortOrder: row.sortOrder,
              isActive: row.isActive,
            },
          });
          createdCount++;
        }
      } catch (err: any) {
        errors.push(`Row ${row.rowNum}: ${err.message}`);
      }
    }

    // 2nd pass: resolve and assign parents
    for (const row of parsedRows) {
      if (row.parentSlug) {
        try {
          const parent = await db.category.findUnique({ where: { slug: row.parentSlug } });
          const child = await db.category.findUnique({ where: { slug: row.slug } });
          if (parent && child && parent.id !== child.id) {
            await db.category.update({
              where: { id: child.id },
              data: {
                parentId: parent.id,
                level: parent.level + 1,
              },
            });
          }
        } catch (err: any) {
          errors.push(`Row ${row.rowNum} hierarchy link: ${err.message}`);
        }
      }
    }

    try {
      await db.auditLog.create({
        data: {
          userId: session.user.id,
          action: "IMPORT_CATEGORIES_CSV",
          resource: "Category",
          recordId: "BULK",
          details: JSON.stringify({ createdCount, updatedCount, errorCount: errors.length }),
        },
      });
    } catch {}

    return NextResponse.json({
      success: true,
      createdCount,
      updatedCount,
      errors,
      message: `Processed ${parsedRows.length} categories: ${createdCount} created, ${updatedCount} updated.`,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to import categories CSV" }, { status: 500 });
  }
}
