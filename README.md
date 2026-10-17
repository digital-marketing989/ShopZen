# ShopZen - Full-Stack Multi-Vendor E-Commerce Platform

A production-grade, Flipkart/Amazon-style multi-vendor marketplace built with **Next.js 16 (App Router, TypeScript strict)**, **Tailwind CSS**, and **PostgreSQL with Prisma ORM**.

---

## 🚀 Key Features

### 🛒 Customer Storefront
- **Modern Homepage**: Dynamic hero banner carousel, hierarchical categories with instant navigation, top deals, and curated collections.
- **Search & Discovery**: Real-time debounce search suggestions, full-text product search, faceted brand & category filters, and price range sliders.
- **Product Experience**: Multi-image zoom gallery, variant selector (RAM, Storage, Color, Size), specifications table, verified customer reviews, and seller credibility badges.
- **Cart & Wishlist**: Real-time Zustand store with quantity updates, coupon code validation, and persistent storage.
- **Multi-Vendor Checkout**: Grouped seller delivery breakdown, address manager, payment gateway selection (Razorpay Test Mode & Cash on Delivery), and instant order placement.
- **Order Tracking & Management**: Visual multi-step delivery progress timeline, package breakdown by vendor SubOrder, downloadable invoice, order cancellation, and return requests.

### 🏪 Multi-Vendor Architecture
- **Automatic SubOrder Splitting**: When an order contains items from multiple vendors, the order engine automatically splits it into distinct per-seller `SubOrder` records within an atomic database transaction.
- **Commission & Payouts**: Automatically computes platform commission (`commissionAmount = subtotal * commissionRate / 100`) and generates merchant payout records.
- **Seller Portal (`/seller`)**: Dedicated vendor dashboard where merchants manage their active catalog, view assigned SubOrders, update courier tracking numbers, and manage dispatch lifecycles.

### 🪔 Durga Puja Maha Sale (85% to 95% Storewide Festive Promotion)
- **Automatic Pricing Engine (`lib/pricing/sale.ts`)**: Applies a stable, deterministic discount between 85% and 95% on every product derived from a hash of product ID while campaign is active. Real MRP is never inflated and is struck through. Minimum price floor is strictly ₹1.
- **Sticky Header Offer Bar**: Festive gradient (deep red, saffron, gold) with live countdown synchronized to server time, "Shop Now" linking to `/sale`, and dismissibility (saved in `sessionStorage`).
- **Dedicated Sale Landing Page (`/sale`)**: Hero banner, category chips, sorting by discount (85%–95%) and price, and compliance notice.
- **Admin Control (`/admin/sales`)**: Create, edit, pause, resume, and end campaigns; change start/end dates in IST; live preview of the header offer bar; per-product and per-category overrides; bulk apply; and full AuditLog tracking.
- **Margin Guard**: Red warnings in admin when sale price falls below cost price, with a toggleable setting *"Block sale below cost"* that clamps discounts to preserve cost margins.
- **Coupon Restriction**: Blocks coupon stacking when `stackWithCoupons` is false with clear notification: *"Coupons cannot be combined with Maha Sale prices"*.
- **Auto-Revert**: Prices automatically revert to normal after `endsAt` or when paused. If a sale ends mid-checkout, the server recalculates totals and alerts the customer: *"Sale ended, prices updated"*.

### 🛡️ Administrative Console (`/admin`)
- **Executive Analytics**: Live GMV, revenue, order counts, customer metrics, and sales trend charts.
- **Live Inventory Manager (`/admin/inventory`)**: Real-time inventory tracking, low-stock threshold alerts (`< 10`), stock adjustment modal (Restock, Return, Shrinkage), and CSV export.
- **Product Catalog (`/admin/products`)**: Instant publish/draft toggle, bulk selection, 1-click product duplication, and CSV export.
- **Order & SubOrder Management (`/admin/orders`)**: Complete visibility over master orders, vendor splits, and status transitions.
- **Returns & Moderation (`/admin/returns`)**: Customer return request approval, rejection, and automated refund triggers.
- **Support Desk & Newsletter (`/admin/tickets`, `/admin/subscribers`)**: Customer support ticket threads and newsletter subscribers export.

---

## 🔑 Pre-Seeded Demo Credentials

All test accounts are pre-configured in `prisma/seed.ts` and can be accessed with 1-click on the `/auth/login` page:

| Role | Email | Password | Access / Capabilities |
| :--- | :--- | :--- | :--- |
| **Super Admin** | `admin@shopzen.com` | `Admin@123` | Full access to `/admin` console, settings, payouts, users, and audit logs |
| **TechWorld Seller** | `seller1@shopzen.com` | `Seller@123` | Access to `/seller` portal (8% commission rate, electronics catalog) |
| **FashionHub Seller** | `seller2@shopzen.com` | `Seller@123` | Access to `/seller` portal (10% commission rate, fashion catalog) |
| **Customer 1** | `customer1@shopzen.com` | `Customer@123` | Rahul Sharma (pre-saved Bengaluru address and orders) |
| **Customer 2** | `customer2@shopzen.com` | `Customer@123` | Priya Patel (pre-saved Noida address and orders) |

---

## 🛠️ Tech Stack & Architecture

- **Framework**: Next.js 16 (App Router, Server Actions, Route Handlers, TypeScript strict mode)
- **Database**: PostgreSQL with Prisma ORM (33 models with soft-deletes, timestamps, and indexes)
- **Styling**: Tailwind CSS with custom responsive design tokens and Lucide icons
- **State Management**: Zustand (Cart & Wishlist persistent client stores)
- **Authentication**: NextAuth.js v5 (JWT sessions, credentials provider, bcryptjs password hashing, role-based route middleware)
- **Payments Layer**: Pluggable provider architecture (`PaymentProvider` interface) supporting **Razorpay** (HMAC-SHA256 signature verification) and **Cash on Delivery**
- **Testing**: Vitest unit test suite verifying pricing calculations, coupon thresholds, and commission splits

---

## ⚙️ Getting Started Locally

### 1. Prerequisites
- Node.js 18+ or 20+
- PostgreSQL database (Local instance, Docker, or free cloud instance like [Neon.tech](https://neon.tech))

### 2. Configure Environment Variables
Copy `.env.example` to `.env` and configure your PostgreSQL connection:
```bash
cp .env.example .env
```
Ensure your `DATABASE_URL` uses the `postgresql://` protocol:
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/shopzen?schema=public"
NEXTAUTH_SECRET="your-super-secret-key-change-in-production-min-32-chars"
NEXTAUTH_URL="http://localhost:3000"
```

*If using Docker for PostgreSQL:*
```bash
docker compose up -d
```

### 3. Initialize Database & Seed Catalog
Push the 33-model schema and run the seed script (creates 100 realistic catalog products, categories, sellers, banners, coupons, and orders):
```bash
npx prisma db push
npm run db:seed
```

### 4. Run Development Server
```bash
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

### 5. Run Unit Tests
```bash
npx vitest run
```

---

## 📧 Email Setup (OTP Delivery)

ShopZen uses **Nodemailer** to deliver real 6-digit OTPs to users' inboxes. Configure one of the providers below.

### How it works

| Environment | SMTP configured? | Behavior |
|:---|:---|:---|
| Development | ❌ No | OTP printed to terminal + yellow dev banner on OTP screen |
| Development | ✅ Yes | Real email sent — no banner, no console OTP |
| Production | ❌ No | Registration returns **HTTP 503** — OTP never printed |
| Production | ✅ Yes | Real email sent |

### Environment variables

```env
EMAIL_PROVIDER="gmail"       # gmail | brevo | resend | custom
SMTP_HOST=""                 # auto-filled from preset; override for custom
SMTP_PORT=""                 # auto-filled from preset; override for custom
SMTP_SECURE=""               # auto-filled; true = implicit TLS (port 465)
SMTP_USER=""                 # your SMTP username / login
SMTP_PASS=""                 # your SMTP password / API key
SMTP_FROM="noreply@shopzen.com"
SMTP_REPLY_TO="support@shopzen.com"
```

---

### Option 1 — Gmail (small scale, ~500 emails/day)

> ⚠️ Gmail SMTP is for development and very small scale only.
> For real traffic, use **Brevo** or **Resend** instead.

1. Go to [myaccount.google.com → Security](https://myaccount.google.com/security)
2. Enable **2-Step Verification**
3. Under 2-Step Verification → scroll to **App passwords**
4. Click **Select app → Other (Custom name)** → name it "ShopZen"
5. Copy the **16-character password** (no spaces)

```env
EMAIL_PROVIDER="gmail"
SMTP_USER="you@gmail.com"
SMTP_PASS="abcdabcdabcdabcd"   # 16-char app password
SMTP_FROM="you@gmail.com"
```

---

### Option 2 — Brevo (free: 300 emails/day, no card required)

1. Create a free account at [app.brevo.com](https://app.brevo.com)
2. **Verify your sender email** at Settings → Senders & Domains
3. Go to Settings → SMTP & API → **SMTP Keys** → Generate a new key

```env
EMAIL_PROVIDER="brevo"
SMTP_USER="your-brevo-login@email.com"
SMTP_PASS="<brevo-smtp-key>"
SMTP_FROM="verified@yourdomain.com"
```

---

### Option 3 — Resend (generous free tier, excellent deliverability)

1. Create an account at [resend.com](https://resend.com)
2. Add & verify your domain (Settings → Domains)
3. Create an API key (API Keys → Create API key)

```env
EMAIL_PROVIDER="resend"
# SMTP_USER is auto-set to "resend" (literal string required by Resend)
SMTP_PASS="re_xxxxxxxxxxxxxxxxxxxxxxxxxxxx"   # your Resend API key
SMTP_FROM="noreply@yourdomain.com"           # must be a verified Resend domain
```

---

### SPF / DKIM / DMARC — prevent spam folder

For production on a custom domain, add these DNS records to your domain registrar:

| Record | Type | Purpose |
|:---|:---|:---|
| `v=spf1 include:_spf.google.com ~all` | TXT on `@` | Authorizes your SMTP server to send on behalf of your domain |
| DKIM selector (provided by your email provider) | TXT | Signs outgoing emails to prove authenticity |
| `v=DMARC1; p=quarantine; rua=mailto:dmarc@yourdomain.com` | TXT on `_dmarc` | Tells receiving servers what to do with unauthenticated emails |

Each provider gives you the exact DNS records to add in their dashboard.

---

### Deployment note

When deploying to **Vercel, Railway, Render, Fly.io**, or any PaaS:

> 🚨 You MUST add all `SMTP_*` and `EMAIL_PROVIDER` variables to your
> **hosting dashboard's environment variable settings**.
>
> Without them, `NODE_ENV=production` and SMTP unconfigured → every
> `/api/auth/register` call returns **HTTP 503 "Email service unavailable"**.

### Admin health check

- **Page**: `/admin/settings/email` — shows SMTP status, last 20 send logs, "Send test email" button
- **API**: `GET /api/admin/email/test` — sends a test to the admin's own address (SUPER_ADMIN only)

### Confirming real delivery

After configuring SMTP:

```bash
# Start the dev server
npm run dev

# In another terminal, watch for the SMTP ready line:
# [EMAIL] SMTP ready (provider: gmail, host: smtp.gmail.com:587)

# Register a new account → check your inbox within ~30 seconds
# The OTP screen should NOT show a yellow banner
# The server terminal should NOT print [DEV EMAIL OTP]
```

---



```
├── app/
│   ├── admin/             # Admin management modules (inventory, products, orders, returns, tickets, subscribers)
│   ├── api/               # Next.js Route Handlers (auth, orders, products, coupons, returns, webhooks)
│   ├── auth/              # Authentication pages (login with 1-click presets, register)
│   ├── cart/              # Interactive cart and multi-vendor checkout page
│   ├── category/          # Category catalog browsing with faceted filters
│   ├── orders/            # Customer orders and detailed multi-vendor tracking
│   ├── product/           # Product detail view with zoom gallery and specs
│   ├── search/            # Full-text product search
│   └── seller/            # Dedicated merchant portal with SubOrder dispatch manager
├── components/
│   ├── admin/             # Admin sidebar, header, metrics cards, and table components
│   └── store/             # Storefront header, footer, product cards, filters, and galleries
├── lib/
│   ├── auth.ts            # NextAuth configuration and credentials provider
│   ├── calculations.ts    # Secure server-side pricing, GST, coupon, and commission calculations
│   ├── db.ts              # Global Prisma client singleton
│   └── payments/          # Pluggable payment providers (Razorpay, COD, Stripe)
├── prisma/
│   ├── schema.prisma      # PostgreSQL schema with 33 models, native enums, and soft deletes
│   └── seed.ts            # Database seed script generating 100 products and demo accounts
└── tests/
    ├── calculations.test.ts # Vitest suite for pricing and order splitting validation
    └── sale-pricing.test.ts # Vitest suite for Maha Sale discounts, margin guard & timezone
```

---

## 🏷️ How to Manage Durga Puja Maha Sale Dates & Discounts

### 1. Via Admin Dashboard (`/admin/sales`)
1. Log in with admin credentials (`admin@shopzen.com` / `Admin@123`) and navigate to **Maha Sales** in the sidebar.
2. **Change Dates**: Update the **Starts At** and **Ends At** fields (configured in IST, stored in UTC). The countdown and discounts automatically end at the set time.
3. **Change Discount Range**: Adjust **Min Discount %** and **Max Discount %** (defaults: `85` and `95`).
4. **Pause or End Sale**: Click **Pause Sale** (or toggle *Campaign Active*) to immediately return all store prices to normal without redeployment.
5. **Per-Product Override**: Enter a custom percentage in the *Catalog Products* table and click **Save**.
6. **Per-Category Override**: Select a category and specify a percentage to override all items in that category.
7. **Bulk Apply**: Enter a discount % in *Bulk Apply To All Products* and click **Apply to All Products**.
8. **Margin Guard**: Toggle **Block Sale Below Cost** to automatically clamp sale prices so they never fall below product cost prices.

### 2. Via Code or Seed (`prisma/seed.ts`)
To update the initial seed dates and discount range:
```ts
const durgaSaleStartsAt = new Date(); // Starts now
const durgaSaleEndsAt = new Date("2026-10-22T23:59:59+05:30"); // 22 Oct 2026 IST

await prisma.saleCampaign.upsert({
  where: { slug: "durga-puja-maha-sale" },
  update: {
    minDiscount: 85,
    maxDiscount: 95,
    startsAt: durgaSaleStartsAt,
    endsAt: durgaSaleEndsAt,
  },
  create: { ... },
});
```
#   S h o p Z e n  
 # ShopZen
# ShopZen
