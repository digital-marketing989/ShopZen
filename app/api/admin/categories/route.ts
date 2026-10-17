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

export async function GET() {
  try {
    const categories = await db.category.findMany({
      include: {
        parent: { select: { id: true, name: true, slug: true } },
        children: {
          select: { id: true, name: true, slug: true, isActive: true, sortOrder: true },
          orderBy: { sortOrder: "asc" },
        },
        _count: { select: { products: true, children: true } },
      },
      orderBy: [{ level: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
    });
    return NextResponse.json({ success: true, data: categories });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to fetch categories" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const name = body.name?.trim();
    if (!name) {
      return NextResponse.json({ error: "Category name is required" }, { status: 400 });
    }

    let slug = body.slug?.trim() || name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "");
    
    // Check slug collision
    const existingSlug = await db.category.findUnique({ where: { slug } });
    if (existingSlug) {
      slug = `${slug}-${Date.now().toString().slice(-4)}`;
    }

    let level = 0;
    if (body.parentId) {
      const parent = await db.category.findUnique({ where: { id: body.parentId } });
      if (!parent) {
        return NextResponse.json({ error: "Selected parent category does not exist" }, { status: 400 });
      }
      level = parent.level + 1;
    }

    const category = await db.category.create({
      data: {
        name,
        slug,
        description: body.description || "",
        image: body.image || null,
        banner: body.banner || null,
        parentId: body.parentId || null,
        level,
        sortOrder: body.sortOrder !== undefined ? Number(body.sortOrder) : 0,
        isActive: body.isActive !== undefined ? Boolean(body.isActive) : true,
        metaTitle: body.metaTitle || null,
        metaDesc: body.metaDesc || null,
      },
    });

    try {
      await db.auditLog.create({
        data: {
          userId: session.user.id,
          action: "CREATE_CATEGORY",
          resource: "Category",
          recordId: category.id,
          details: JSON.stringify(category),
        },
      });
    } catch {}

    return NextResponse.json({ success: true, data: category }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to create category" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: "Category ID is required" }, { status: 400 });
    }

    const existing = await db.category.findUnique({
      where: { id },
      include: { children: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }

    // Prevent circular hierarchy: parent cannot be self or any of its descendants
    if (updates.parentId) {
      if (updates.parentId === id) {
        return NextResponse.json({ error: "A category cannot be its own parent" }, { status: 400 });
      }

      // Check if candidate parent is a descendant
      let currentCheck = updates.parentId;
      while (currentCheck) {
        const parentRecord: any = await db.category.findUnique({ where: { id: currentCheck } });
        if (!parentRecord) break;
        if (parentRecord.id === id) {
          return NextResponse.json({ error: "Circular dependency: cannot set parent to a child category" }, { status: 400 });
        }
        currentCheck = parentRecord.parentId;
      }
    }

    let level = existing.level;
    if (updates.parentId !== undefined) {
      if (updates.parentId) {
        const parent = await db.category.findUnique({ where: { id: updates.parentId } });
        level = parent ? parent.level + 1 : 0;
      } else {
        level = 0;
      }
    }

    const updated = await db.category.update({
      where: { id },
      data: {
        name: updates.name !== undefined ? updates.name.trim() : existing.name,
        slug: updates.slug !== undefined ? updates.slug.trim() : existing.slug,
        description: updates.description !== undefined ? updates.description : existing.description,
        image: updates.image !== undefined ? updates.image : existing.image,
        banner: updates.banner !== undefined ? updates.banner : existing.banner,
        parentId: updates.parentId !== undefined ? updates.parentId : existing.parentId,
        level,
        sortOrder: updates.sortOrder !== undefined ? Number(updates.sortOrder) : existing.sortOrder,
        isActive: updates.isActive !== undefined ? Boolean(updates.isActive) : existing.isActive,
      },
    });

    try {
      await db.auditLog.create({
        data: {
          userId: session.user.id,
          action: "UPDATE_CATEGORY",
          resource: "Category",
          recordId: id,
          details: JSON.stringify(updates),
        },
      });
    } catch {}

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to update category" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const reassignToId = searchParams.get("reassignToId");

    if (!id) {
      return NextResponse.json({ error: "Category ID is required" }, { status: 400 });
    }

    const category = await db.category.findUnique({
      where: { id },
      include: {
        _count: { select: { products: true, children: true } },
      },
    });

    if (!category) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }

    const productCount = category._count.products;
    const childCount = category._count.children;

    if (productCount > 0 || childCount > 0) {
      if (!reassignToId) {
        return NextResponse.json(
          {
            error: `Cannot delete category containing ${productCount} product(s) and ${childCount} subcategory(ies). Please reassign them to another category first.`,
            productCount,
            childCount,
            requiresReassign: true,
          },
          { status: 400 }
        );
      }

      if (reassignToId === id) {
        return NextResponse.json({ error: "Cannot reassign items to the category being deleted" }, { status: 400 });
      }

      const target = await db.category.findUnique({ where: { id: reassignToId } });
      if (!target) {
        return NextResponse.json({ error: "Reassignment target category not found" }, { status: 404 });
      }

      // Reassign products and child categories
      if (productCount > 0) {
        await db.product.updateMany({
          where: { categoryId: id },
          data: { categoryId: target.id },
        });
      }

      if (childCount > 0) {
        await db.category.updateMany({
          where: { parentId: id },
          data: { parentId: target.id, level: target.level + 1 },
        });
      }
    }

    await db.category.delete({ where: { id } });

    try {
      await db.auditLog.create({
        data: {
          userId: session.user.id,
          action: "DELETE_CATEGORY",
          resource: "Category",
          recordId: id,
          details: JSON.stringify({ categoryName: category.name, reassignToId }),
        },
      });
    } catch {}

    return NextResponse.json({
      success: true,
      message: `Category "${category.name}" safely deleted.`,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to delete category" }, { status: 500 });
  }
}
