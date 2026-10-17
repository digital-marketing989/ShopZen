# ShopZen API Documentation

All API endpoints are implemented as Next.js Route Handlers located under `/app/api/`. Responses adhere to standard JSON formats with `{ success: true, data: ... }` on success and `{ error: "Message" }` with appropriate HTTP status codes on errors.

---

## 🔐 Authentication & Session
Authentication is managed via NextAuth v5 session cookies. Protected endpoints verify the caller's session role (`CUSTOMER`, `SELLER`, `ADMIN`, `SUPER_ADMIN`).

---

## 🛍️ Products & Catalog

### `GET /api/products`
Retrieves a paginated list of products with optional filtering.
- **Query Parameters**:
  - `page` (number, default: `1`): Current page.
  - `limit` (number, default: `12`): Items per page.
  - `category` (string): Filter by category slug or ID.
  - `brand` (string): Filter by brand slug or ID.
  - `minPrice` (number): Minimum price filter.
  - `maxPrice` (number): Maximum price filter.
  - `sort` (string): Sort order (`price_asc`, `price_desc`, `newest`, `rating`).
  - `search` (string): Full-text search keyword.
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "products": [...],
      "pagination": { "page": 1, "limit": 12, "total": 100, "totalPages": 9 }
    }
  }
  ```

### `GET /api/products/[slug]`
Retrieves complete product details by slug or ID.
- **Response**: Includes images, variants, attributes, category, brand, and verified reviews.

### `GET /api/search/suggestions?q=:query`
Dynamic real-time search suggestion endpoint returning top matching products, categories, and brands.

---

## 🛒 Orders & Multi-Vendor Engine

### `POST /api/orders`
Creates a master customer order and automatically splits it into per-seller `SubOrder` records.
- **Authentication**: Required (`CUSTOMER`, `SELLER`, `ADMIN`).
- **Request Body**:
  ```json
  {
    "items": [
      { "productId": "prod_1", "variantId": null, "quantity": 2 }
    ],
    "address": {
      "name": "Rahul Sharma",
      "phone": "9876543210",
      "line1": "Flat 402, Green Valley Towers",
      "city": "Noida",
      "state": "Uttar Pradesh",
      "pincode": "201301"
    },
    "paymentMethod": "CASHFREE_LINK",
    "couponCode": "WELCOME10"
  }
  ```
- **Business Logic**:
  1. Validates real-time inventory for each item.
  2. Fetches authoritative prices from the database (never trusts client prices).
  3. Recomputes subtotal, GST taxes, coupon discounts, and delivery fees.
  4. Groups items by seller and generates distinct `SubOrder` records with calculated commission (`commissionAmount = subtotal * commissionRate / 100`).
  5. Generates pending `Payout` records for each vendor.
  6. Atomic execution inside `db.$transaction`.
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "id": "ord_cuid",
      "orderNumber": "SZ-2026-X89",
      "total": 11999,
      "subOrders": [...]
    }
  }
  ```

### `GET /api/orders/[id]`
Retrieves master order details, tracking timeline, and vendor SubOrder breakdown.

### `PATCH /api/orders/[id]`
Updates order status or tracking details.
- **Permissions**: Customer can cancel if order is `PLACED`. Admin can update any status.
- **Request Body**:
  ```json
  {
    "status": "CANCELLED" | "CONFIRMED" | "SHIPPED" | "DELIVERED",
    "note": "Optional status update note",
    "trackingId": "DEL123456"
  }
  ```

---

## 🏪 Seller Portal Endpoints

### `PATCH /api/seller/suborders/[id]`
Allows a vendor to update the dispatch status and tracking number for their assigned SubOrder.
- **Authentication**: Required (`SELLER` or `ADMIN`).
- **Request Body**:
  ```json
  {
    "status": "PACKED" | "SHIPPED" | "DELIVERED",
    "courierName": "BlueDart",
    "trackingId": "BLUEDART-89123"
  }
  ```
- **Security**: Validates that the requesting seller owns the SubOrder.

---

## 💳 Payments

### `POST /api/orders/[id]/payment-proof`
Submits payment proof (Transaction ID / UTR and amount paid) for a Cashfree order.
- **Request Body**: `{ "utr": "UTR12345678", "amountPaid": 11999, "proofUrl": "..." }`
- **Response**: `{ "success": true, "message": "Payment proof submitted successfully" }`

## 🏷️ Coupons & Promotions

### `POST /api/coupons/apply`
Validates a promotional coupon code against the current cart subtotal.
- **Request Body**:
  ```json
  {
    "code": "WELCOME10",
    "cartTotal": 1500
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "code": "WELCOME10",
      "discount": 150,
      "description": "10% off on first order"
    }
  }
  ```

---

## 🔄 Returns & Customer Support

### `POST /api/returns`
Submits a customer return request for a delivered order.
- **Authentication**: Required (`CUSTOMER`).
- **Request Body**:
  ```json
  {
    "orderId": "ord_cuid",
    "reason": "Defective or damaged product",
    "description": "Left earbud sound is muffled"
  }
  ```

### `GET /api/returns`
Fetches all return requests filed by the authenticated customer.

---

## ⚙️ Administration Endpoints

### `PATCH /api/admin/products/[id]`
Updates product details, stock levels, or published status.

### `POST /api/admin/products/duplicate`
Clones an existing product with its images, categories, and attributes into a new draft item.

### `PATCH /api/admin/inventory/[id]`
Adjusts warehouse stock levels and logs an audit record in `StockLog` (RESTOCK, ADJUSTMENT, RETURN).
