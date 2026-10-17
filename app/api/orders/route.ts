import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import {
  calculateOrderPricing,
  calculateSubOrderSplit,
  validateStockAvailability,
} from "@/lib/calculations";
import { checkAndAutoCancelExpiredOrders } from "@/lib/order-expiry";
import { getActiveSaleCampaign, getEffectivePrice } from "@/lib/pricing/sale";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    const currentUser = session?.user?.id
      ? await db.user.findUnique({ where: { id: session.user.id }, select: { id: true, role: true } })
      : null;

    // Auto-cancel unpaid Cashfree orders older than 24 hours
    checkAndAutoCancelExpiredOrders().catch((e) => console.error(e));

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const page = Math.max(1, Number(searchParams.get("page") || 1));
    const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit") || 10)));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (currentUser && (currentUser.role === "ADMIN" || currentUser.role === "SUPER_ADMIN")) {
      // Admin sees all
    } else if (currentUser) {
      where.userId = currentUser.id;
    } else {
      const orderNumber = searchParams.get("orderNumber");
      if (orderNumber) {
        where.orderNumber = orderNumber;
      }
    }
    if (status) {
      where.status = status;
    }

    const [orders, total] = await Promise.all([
      db.order.findMany({
        where,
        include: {
          subOrders: {
            include: {
              seller: { select: { businessName: true } },
              items: {
                include: {
                  product: {
                    select: {
                      id: true,
                      title: true,
                      slug: true,
                      images: { take: 1, select: { url: true } },
                    },
                  },
                },
              },
            },
          },
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  title: true,
                  slug: true,
                  images: { take: 1, select: { url: true } },
                },
              },
            },
          },
          address: true,
          statusHistory: { orderBy: { createdAt: "desc" } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      db.order.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        orders,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error: any) {
    if (error.statusCode === 401 || error.code === "SESSION_EXPIRED" || error.code === "UNAUTHORIZED") {
      return NextResponse.json(
        { success: false, code: error.code || "UNAUTHORIZED", message: error.message || "Your session expired, please sign in again" },
        { status: 401 }
      );
    }
    console.error("Orders GET error:", error);
    return NextResponse.json({ success: false, code: "FETCH_FAILED", message: "Failed to fetch orders" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const session = await auth();
    let currentUser: any = null;

    if (session?.user?.id) {
      currentUser = await db.user.findUnique({
        where: { id: session.user.id },
        select: { id: true, name: true, email: true, role: true, walletBalance: true },
      });
    }

    if (!currentUser) {
      const cleanPhone = (body.address?.phone || "").replace(/[^0-9]/g, "").slice(-10);
      const guestEmail = (body.address?.email && body.address.email.includes("@"))
        ? body.address.email.trim().toLowerCase()
        : cleanPhone
        ? `customer_${cleanPhone}@shopzen.local`
        : "customer@shopzen.local";

      currentUser = await db.user.findUnique({ where: { email: guestEmail } });
      if (!currentUser) {
        currentUser = await db.user.create({
          data: {
            email: guestEmail,
            name: body.address?.name || "Customer",
            phone: body.address?.phone || cleanPhone || null,
            role: "CUSTOMER",
            status: "ACTIVE",
            emailVerified: true,
            isActive: true,
          },
        });
      }
    }
    const {
      addressId,
      items: clientItems,
      couponCode,
      notes,
      useWallet = false,
    } = body;

    if (!clientItems || !clientItems.length) {
      return NextResponse.json(
        { success: false, code: "CART_EMPTY", message: "Your cart is empty" },
        { status: 400 }
      );
    }

    // 1. Verify existing address ownership or prepare new address data for atomic transaction
    let existingAddressId: string | null = null;
    let newAddressData: any = null;

    if (addressId) {
      const existingAddress = await db.address.findUnique({ where: { id: addressId } });
      if (!existingAddress || existingAddress.userId !== currentUser.id) {
        return NextResponse.json(
          {
            success: false,
            code: "INVALID_ADDRESS",
            message: "Delivery address is invalid or does not belong to your account",
          },
          { status: 400 }
        );
      }
      existingAddressId = existingAddress.id;
    } else if (body.address) {
      if (!body.address.line1 || !body.address.city || !body.address.pincode) {
        return NextResponse.json(
          { success: false, code: "INCOMPLETE_ADDRESS", message: "Please provide complete delivery address" },
          { status: 400 }
        );
      }
      newAddressData = {
        userId: currentUser.id,
        name: body.address.name || currentUser.name || "Customer",
        phone: body.address.phone || "9999999999",
        line1: body.address.line1,
        line2: body.address.line2 || "",
        city: body.address.city,
        state: body.address.state || "State",
        pincode: body.address.pincode,
        country: body.address.country || "India",
        type: body.address.type || "HOME",
        isDefault: true,
      };
    } else {
      const defaultAddr = await db.address.findFirst({ where: { userId: currentUser.id } });
      if (!defaultAddr) {
        return NextResponse.json(
          { success: false, code: "ADDRESS_REQUIRED", message: "Delivery address is required" },
          { status: 400 }
        );
      }
      existingAddressId = defaultAddr.id;
    }

    // 2. Fetch fresh product data from DB - NEVER trust client prices!
    const productIds = clientItems.map((i: any) => i.productId);
    const dbProducts = await db.product.findMany({
      where: { id: { in: productIds } },
      include: {
        seller: true,
        images: { take: 1 },
      },
    });
    const productMap = new Map(dbProducts.map((p) => [p.id, p]));

    // Check if any product is missing
    const missingProducts = clientItems.filter((i: any) => !productMap.has(i.productId));
    if (missingProducts.length > 0) {
      return NextResponse.json(
        {
          success: false,
          code: "ITEMS_UNAVAILABLE",
          message: "Some items in your cart are no longer available",
          missingProductIds: missingProducts.map((i: any) => i.productId),
        },
        { status: 400 }
      );
    }

    // 3. Stock validation
    const stockMap = new Map(dbProducts.map((p) => [p.id, p.totalStock]));
    const stockCheck = validateStockAvailability(clientItems, stockMap);
    if (!stockCheck.valid) {
      return NextResponse.json(
        { success: false, code: "INSUFFICIENT_STOCK", message: stockCheck.error || "Insufficient stock" },
        { status: 400 }
      );
    }

    const now = new Date();
    const { campaign, blockSaleBelowCost } = await getActiveSaleCampaign(now);

    // Reject coupon codes if Maha Sale is active and stackWithCoupons is false
    if (couponCode && campaign && campaign.isActive && campaign.stackWithCoupons === false) {
      return NextResponse.json(
        { success: false, code: "COUPON_INCOMPATIBLE", message: "Coupons cannot be combined with Maha Sale prices" },
        { status: 400 }
      );
    }

    // Fetch variants if variantId present
    const variantIds = clientItems.map((ci: any) => ci.variantId).filter(Boolean);
    const dbVariants = variantIds.length > 0
      ? await db.variant.findMany({ where: { id: { in: variantIds } } })
      : [];
    const variantMap = new Map(dbVariants.map((v) => [v.id, v]));

    // Check if client items expected sale pricing, but sale ended
    let clientExpectedSale = false;
    for (const ci of clientItems) {
      const dbProd = productMap.get(ci.productId);
      if (dbProd && ci.price) {
        if (ci.price < dbProd.price * 0.5) {
          clientExpectedSale = true;
          break;
        }
      }
    }

    // 4. Server-side effective price calculation - single source of truth
    const serverPricingItems = clientItems.map((ci: any) => {
      const dbProd = productMap.get(ci.productId)!;
      const dbVariant = ci.variantId ? variantMap.get(ci.variantId) : null;
      const eff = getEffectivePrice(dbProd, dbVariant, now, campaign, blockSaleBelowCost);

      return {
        productId: dbProd.id,
        variantId: ci.variantId || null,
        sellerId: dbProd.sellerId || "default-seller",
        quantity: Math.max(1, Number(ci.quantity || 1)),
        price: eff.price,
        mrp: eff.mrp,
        discount: eff.discount,
        isSaleActive: eff.isSaleActive,
        title: dbProd.title,
        image: dbProd.images?.[0]?.url || ci.image || null,
      };
    });

    // Check Coupon
    let couponRecord: any = null;
    if (couponCode) {
      couponRecord = await db.coupon.findUnique({
        where: { code: couponCode.toUpperCase().trim() },
      });
      if (!couponRecord || !couponRecord.isActive) {
        couponRecord = null;
      }
    }

    // Check user wallet
    const walletBalance = useWallet ? (currentUser.walletBalance || 0) : 0;
    const pricing = calculateOrderPricing(serverPricingItems, couponRecord, walletBalance);

    // If sale ended while customer was in checkout, recompute and alert user
    if (clientExpectedSale && (!campaign || !campaign.isActive)) {
      return NextResponse.json(
        {
          success: false,
          code: "SALE_ENDED",
          message: "Sale ended, prices updated",
          newTotal: pricing.finalTotal,
        },
        { status: 409 }
      );
    }

    // 5. Multi-Vendor SubOrders Split Calculation
    const sellersMap = new Map<string, any>();
    dbProducts.forEach((p) => {
      if (p.seller) {
        sellersMap.set(p.seller.id, p.seller);
      }
    });

    const subOrderSplits = calculateSubOrderSplit(serverPricingItems, sellersMap);

    const orderNumber = `ORD-${Date.now().toString(36).toUpperCase()}-${Math.floor(
      1000 + Math.random() * 9000
    )}`;

    const initialStatus = "PENDING_PAYMENT";
    const reservedUntil = new Date(Date.now() + 30 * 60 * 1000);

    // 6. Execute atomic address creation, order creation & stock reservation inside single transaction
    const createdOrder = await db.$transaction(async (tx) => {
      let finalAddressId = existingAddressId;
      if (newAddressData) {
        const createdAddr = await tx.address.create({
          data: newAddressData,
        });
        finalAddressId = createdAddr.id;
      }

      if (!finalAddressId) {
        throw new Error("Delivery address could not be resolved");
      }

      // Create master order
      const masterOrder = await tx.order.create({
        data: {
          orderNumber,
          userId: currentUser.id,
          addressId: finalAddressId,
          couponId: couponRecord?.id || null,
          status: initialStatus,
          paymentStatus: "PENDING",
          paymentMethod: "CASHFREE_LINK",
          subtotal: pricing.subtotal,
          discount: pricing.mrpDiscount,
          couponDiscount: pricing.couponDiscount,
          deliveryFee: pricing.deliveryFee,
          tax: pricing.tax,
          total: pricing.finalTotal,
          notes: notes || null,
          reservedUntil,
          statusHistory: {
            create: {
              status: initialStatus,
              note: "Order created, awaiting Cashfree payment (stock reserved for 30 min)",
            },
          },
        },
      });

      // Create per-seller SubOrders and OrderItems
      for (let i = 0; i < subOrderSplits.length; i++) {
        const split = subOrderSplits[i];
        const subOrderNumber = `${orderNumber}-S${i + 1}`;

        let targetSellerId = split.sellerId;
        const sellerExists = await tx.seller.findUnique({ where: { id: targetSellerId } });
        if (!sellerExists) {
          const firstSeller = await tx.seller.findFirst();
          if (firstSeller) targetSellerId = firstSeller.id;
        }

        const subOrder = await tx.subOrder.create({
          data: {
            subOrderNumber,
            orderId: masterOrder.id,
            sellerId: targetSellerId,
            status: initialStatus,
            subtotal: split.subtotal,
            commissionRate: split.commissionRate,
            commissionAmount: split.commissionAmount,
            payoutAmount: split.payoutAmount,
            statusHistory: {
              create: {
                status: initialStatus,
                note: "Sub-order created, awaiting Cashfree payment verification",
              },
            },
          },
        });

        // Create line items attached to this sub-order
        for (const item of split.items) {
          await tx.orderItem.create({
            data: {
              orderId: masterOrder.id,
              subOrderId: subOrder.id,
              productId: item.productId,
              variantId: item.variantId || null,
              sellerId: targetSellerId,
              title: item.title || "Product",
              image: item.image || null,
              price: item.price,
              mrp: item.mrp,
              quantity: item.quantity,
              discount: (item as any).discount || (item.mrp > item.price ? Math.round(((item.mrp - item.price) / item.mrp) * 100) : 0),
              tax: Math.round(item.price * item.quantity * 0.18),
              total: item.price * item.quantity,
              status: initialStatus,
            },
          });
        }
      }

      // Reserve stock for Cashfree order (30 mins)
      for (const item of clientItems) {
        const qty = Number(item.quantity || 1);
        await tx.inventory.upsert({
          where: { productId: item.productId },
          update: { reserved: { increment: qty } },
          create: {
            productId: item.productId,
            quantity: productMap.get(item.productId)?.totalStock || 0,
            reserved: qty,
          },
        });

        await tx.stockLog.create({
          data: {
            productId: item.productId,
            type: "RESERVE",
            quantity: qty,
            note: `Reserved for Cashfree order ${orderNumber} (30 mins)`,
          },
        });
      }

      // Deduct wallet if used
      if (pricing.appliedWallet > 0) {
        await tx.user.update({
          where: { id: currentUser.id },
          data: { walletBalance: { decrement: pricing.appliedWallet } },
        });
      }

      // Increment coupon usage
      if (couponRecord) {
        await tx.coupon.update({
          where: { id: couponRecord.id },
          data: { usedCount: { increment: 1 } },
        });
      }

      // Create Payment record
      await tx.payment.create({
        data: {
          orderId: masterOrder.id,
          method: "CASHFREE_LINK",
          status: "PENDING",
          amount: pricing.finalTotal,
          currency: "INR",
        },
      });

      return masterOrder;
    });

    return NextResponse.json({
      success: true,
      data: createdOrder,
    }, { status: 201 });
  } catch (error: any) {
    console.error("Order creation transaction error:", error);

    if (error.code === "P2003") {
      return NextResponse.json(
        {
          success: false,
          code: "FOREIGN_KEY_VIOLATION",
          message: "Your session expired or referenced data not found. Please sign in again.",
        },
        { status: 401 }
      );
    }

    if (error.code === "P2002") {
      return NextResponse.json(
        {
          success: false,
          code: "UNIQUE_CONSTRAINT_VIOLATION",
          message: "A conflicting order or payment record already exists.",
        },
        { status: 409 }
      );
    }

    if (error.statusCode === 401 || error.code === "SESSION_EXPIRED" || error.code === "UNAUTHORIZED") {
      return NextResponse.json(
        {
          success: false,
          code: error.code || "UNAUTHORIZED",
          message: error.message || "Your session expired, please sign in again",
        },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        code: "ORDER_CREATION_FAILED",
        message: error.message || "Failed to place order",
      },
      { status: 500 }
    );
  }
}
