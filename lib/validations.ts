import { z } from "zod";

// Auth schemas
export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  phone: z.string().optional(),
});

// Address schemas
export const addressSchema = z.object({
  name: z.string().min(2, "Name is required"),
  phone: z.string().min(10, "Valid phone number required"),
  line1: z.string().min(5, "Address is required"),
  line2: z.string().optional(),
  city: z.string().min(2, "City is required"),
  state: z.string().min(2, "State is required"),
  pincode: z.string().length(6, "Pincode must be 6 digits"),
  country: z.string().default("India"),
  type: z.enum(["HOME", "WORK", "OTHER"]).default("HOME"),
  isDefault: z.boolean().default(false),
});

// Product schemas
export const productSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  slug: z.string().optional(),
  description: z.string().optional(),
  shortDescription: z.string().optional(),
  highlights: z.array(z.string()).optional(),
  categoryId: z.string().min(1, "Category is required"),
  brandId: z.string().optional(),
  sku: z.string().optional(),
  barcode: z.string().optional(),
  mrp: z.number().positive("MRP must be positive"),
  price: z.number().positive("Price must be positive"),
  costPrice: z.number().optional(),
  taxRate: z.number().min(0).max(100).default(18),
  weight: z.number().optional(),
  status: z
    .enum(["DRAFT", "PUBLISHED", "UNPUBLISHED", "ARCHIVED"])
    .default("DRAFT"),
  isDigital: z.boolean().default(false),
  isFeatured: z.boolean().default(false),
  isFlashSale: z.boolean().default(false),
  flashSalePrice: z.number().optional(),
  flashSaleEnds: z.string().optional(),
  lowStockAlert: z.number().default(10),
  totalStock: z.number().default(0),
  metaTitle: z.string().optional(),
  metaDesc: z.string().optional(),
  metaKeywords: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

// Category schema
export const categorySchema = z.object({
  name: z.string().min(2, "Name is required"),
  slug: z.string().optional(),
  description: z.string().optional(),
  parentId: z.string().optional().nullable(),
  sortOrder: z.number().default(0),
  isActive: z.boolean().default(true),
  metaTitle: z.string().optional(),
  metaDesc: z.string().optional(),
});

// Brand schema
export const brandSchema = z.object({
  name: z.string().min(2, "Name is required"),
  slug: z.string().optional(),
  description: z.string().optional(),
  website: z.string().url().optional().or(z.literal("")),
  isActive: z.boolean().default(true),
});

// Coupon schema
export const couponSchema = z.object({
  code: z.string().min(3).max(20).toUpperCase(),
  type: z.enum(["PERCENTAGE", "FIXED", "FREE_SHIPPING"]),
  value: z.number().positive(),
  minCartValue: z.number().min(0).default(0),
  maxDiscount: z.number().optional(),
  categoryId: z.string().optional().nullable(),
  usageLimit: z.number().optional(),
  perUserLimit: z.number().default(1),
  isActive: z.boolean().default(true),
  startsAt: z.string().optional(),
  expiresAt: z.string().optional(),
  description: z.string().optional(),
});

// Order schemas
export const checkoutSchema = z.object({
  addressId: z.string().min(1, "Address is required"),
  paymentMethod: z.literal("CASHFREE_LINK").default("CASHFREE_LINK"),
  couponCode: z.string().optional(),
  notes: z.string().optional(),
});

// Review schema
export const reviewSchema = z.object({
  productId: z.string(),
  rating: z.number().min(1).max(5),
  title: z.string().optional(),
  body: z.string().optional(),
});

// Seller registration schema
export const sellerRegistrationSchema = z.object({
  businessName: z.string().min(2, "Business name is required"),
  businessType: z.enum(["INDIVIDUAL", "COMPANY"]).default("INDIVIDUAL"),
  gstin: z.string().optional(),
  pan: z.string().optional(),
  bankAccount: z.string().optional(),
  bankIfsc: z.string().optional(),
  bankName: z.string().optional(),
  accountHolder: z.string().optional(),
});

// Support ticket schema
export const supportTicketSchema = z.object({
  subject: z.string().min(5, "Subject is required"),
  body: z.string().min(10, "Message is required"),
  category: z.string().default("GENERAL"),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
});

// Banner schema
export const bannerSchema = z.object({
  title: z.string().min(2, "Title is required"),
  subtitle: z.string().optional(),
  link: z.string().optional(),
  categoryId: z.string().optional().nullable(),
  type: z.enum(["HERO", "CATEGORY", "FLASH_SALE", "PROMO"]).default("HERO"),
  position: z.number().default(0),
  isActive: z.boolean().default(true),
  startsAt: z.string().optional(),
  endsAt: z.string().optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type AddressInput = z.infer<typeof addressSchema>;
export type ProductInput = z.infer<typeof productSchema>;
export type CategoryInput = z.infer<typeof categorySchema>;
export type BrandInput = z.infer<typeof brandSchema>;
export type CouponInput = z.infer<typeof couponSchema>;
export type CheckoutInput = z.infer<typeof checkoutSchema>;
export type ReviewInput = z.infer<typeof reviewSchema>;
export type SellerRegistrationInput = z.infer<typeof sellerRegistrationSchema>;
export type SupportTicketInput = z.infer<typeof supportTicketSchema>;
export type BannerInput = z.infer<typeof bannerSchema>;
