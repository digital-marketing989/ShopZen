import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting seed...");

  // Clean existing data
  await prisma.auditLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.supportTicket.deleteMany();
  await prisma.newsletterSubscriber.deleteMany();
  await prisma.payout.deleteMany();
  await prisma.refund.deleteMany();
  await prisma.returnRequest.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.orderStatusHistory.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.subOrder.deleteMany();
  await prisma.order.deleteMany();
  await prisma.cartItem.deleteMany();
  await prisma.cart.deleteMany();
  await prisma.wishlistItem.deleteMany();
  await prisma.wishlist.deleteMany();
  await prisma.review.deleteMany();
  await prisma.question.deleteMany();
  await prisma.stockLog.deleteMany();
  await prisma.inventory.deleteMany();
  await prisma.productAttribute.deleteMany();
  await prisma.variant.deleteMany();
  await prisma.productImage.deleteMany();
  await prisma.product.deleteMany();
  await prisma.attributeTemplate.deleteMany();
  await prisma.banner.deleteMany();
  await prisma.cmsPage.deleteMany();
  await prisma.coupon.deleteMany();
  await prisma.setting.deleteMany();
  await prisma.seller.deleteMany();
  await prisma.address.deleteMany();
  await prisma.otpToken.deleteMany();
  await prisma.user.deleteMany();
  await prisma.brand.deleteMany();
  await prisma.category.deleteMany();
  await prisma.saleCampaign.deleteMany();

  // ==================== USERS ====================
  const hashedAdminPass = await bcrypt.hash("Admin@123", 12);
  const hashedSellerPass = await bcrypt.hash("Seller@123", 12);
  const hashedCustomerPass = await bcrypt.hash("Customer@123", 12);

  const superAdmin = await prisma.user.create({
    data: {
      name: "Super Admin",
      email: "admin@shopzen.com",
      password: hashedAdminPass,
      role: "SUPER_ADMIN",
      isActive: true,
      emailVerified: true,
      status: "ACTIVE",
    },
  });

  const seller1User = await prisma.user.create({
    data: {
      name: "TechWorld India",
      email: "seller1@shopzen.com",
      password: hashedSellerPass,
      role: "SELLER",
      isActive: true,
      emailVerified: true,
      status: "ACTIVE",
    },
  });

  const seller2User = await prisma.user.create({
    data: {
      name: "FashionHub Store",
      email: "seller2@shopzen.com",
      password: hashedSellerPass,
      role: "SELLER",
      isActive: true,
      emailVerified: true,
      status: "ACTIVE",
    },
  });

  const customer1 = await prisma.user.create({
    data: {
      name: "Rahul Sharma",
      email: "customer1@shopzen.com",
      password: hashedCustomerPass,
      role: "CUSTOMER",
      isActive: true,
      emailVerified: true,
      status: "ACTIVE",
    },
  });

  const customer2 = await prisma.user.create({
    data: {
      name: "Priya Patel",
      email: "customer2@shopzen.com",
      password: hashedCustomerPass,
      role: "CUSTOMER",
      isActive: true,
      emailVerified: true,
      status: "ACTIVE",
    },
  });

  // ==================== SELLERS ====================
  const seller1 = await prisma.seller.create({
    data: {
      userId: seller1User.id,
      businessName: "TechWorld India",
      businessType: "COMPANY",
      gstin: "29ABCDE1234F1Z5",
      pan: "ABCDE1234F",
      bankAccount: "1234567890",
      bankIfsc: "HDFC0001234",
      bankName: "HDFC Bank",
      accountHolder: "TechWorld India Pvt Ltd",
      commissionRate: 8.0,
      status: "APPROVED",
      totalSales: 250000,
      totalEarnings: 230000,
      rating: 4.5,
    },
  });

  const seller2 = await prisma.seller.create({
    data: {
      userId: seller2User.id,
      businessName: "FashionHub Store",
      businessType: "INDIVIDUAL",
      gstin: "27FGHIJ5678K2L6",
      pan: "FGHIJ5678K",
      bankAccount: "9876543210",
      bankIfsc: "ICIC0005678",
      bankName: "ICICI Bank",
      accountHolder: "Neha Joshi",
      commissionRate: 10.0,
      status: "APPROVED",
      totalSales: 150000,
      totalEarnings: 135000,
      rating: 4.2,
    },
  });

  // ==================== ADDRESSES ====================
  const address1 = await prisma.address.create({
    data: {
      userId: customer1.id,
      name: "Rahul Sharma",
      phone: "9777777771",
      line1: "204, Sunshine Apartments, MG Road",
      city: "Bengaluru",
      state: "Karnataka",
      pincode: "560001",
      isDefault: true,
      type: "HOME",
    },
  });

  const address2 = await prisma.address.create({
    data: {
      userId: customer2.id,
      name: "Priya Patel",
      phone: "9777777772",
      line1: "B-42, Sector 15, Noida",
      city: "Noida",
      state: "Uttar Pradesh",
      pincode: "201301",
      isDefault: true,
      type: "HOME",
    },
  });

  // ==================== BRANDS ====================
  const brands = await Promise.all([
    prisma.brand.create({ data: { name: "Samsung", slug: "samsung", description: "Leading electronics brand", isActive: true } }),
    prisma.brand.create({ data: { name: "Apple", slug: "apple", description: "Premium tech brand", isActive: true } }),
    prisma.brand.create({ data: { name: "Nike", slug: "nike", description: "Sports & lifestyle brand", isActive: true } }),
    prisma.brand.create({ data: { name: "Adidas", slug: "adidas", description: "Sports apparel brand", isActive: true } }),
    prisma.brand.create({ data: { name: "Puma", slug: "puma", description: "Sports lifestyle brand", isActive: true } }),
    prisma.brand.create({ data: { name: "Sony", slug: "sony", description: "Consumer electronics", isActive: true } }),
    prisma.brand.create({ data: { name: "boAt", slug: "boat", description: "Audio & accessories brand", isActive: true } }),
    prisma.brand.create({ data: { name: "Levi's", slug: "levis", description: "Denim & casual wear", isActive: true } }),
  ]);

  const [samsung, apple, nike, adidas, puma, sony, boat, levis] = brands;

  // ==================== CATEGORIES ====================
  // Top-level categories
  const electronics = await prisma.category.create({
    data: { name: "Electronics", slug: "electronics", description: "Gadgets and devices", level: 0, sortOrder: 1, isActive: true, image: "https://images.unsplash.com/photo-1498049794561-7780e7231661?w=400" },
  });
  const fashion = await prisma.category.create({
    data: { name: "Fashion", slug: "fashion", description: "Clothing and accessories", level: 0, sortOrder: 2, isActive: true, image: "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=400" },
  });
  const homeKitchen = await prisma.category.create({
    data: { name: "Home & Kitchen", slug: "home-kitchen", description: "Home essentials", level: 0, sortOrder: 3, isActive: true, image: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400" },
  });
  const sports = await prisma.category.create({
    data: { name: "Sports", slug: "sports", description: "Sports and fitness", level: 0, sortOrder: 4, isActive: true, image: "https://images.unsplash.com/photo-1517649763962-0c623066013b?w=400" },
  });
  const books = await prisma.category.create({
    data: { name: "Books", slug: "books", description: "Books and media", level: 0, sortOrder: 5, isActive: true, image: "https://images.unsplash.com/photo-1512820790803-83ca734da794?w=400" },
  });

  // Subcategories
  const mobiles = await prisma.category.create({
    data: { name: "Mobiles", slug: "mobiles", parentId: electronics.id, level: 1, sortOrder: 1, isActive: true },
  });
  const laptops = await prisma.category.create({
    data: { name: "Laptops", slug: "laptops", parentId: electronics.id, level: 1, sortOrder: 2, isActive: true },
  });
  const audio = await prisma.category.create({
    data: { name: "Audio & Headphones", slug: "audio-headphones", parentId: electronics.id, level: 1, sortOrder: 3, isActive: true },
  });
  const tvCategory = await prisma.category.create({
    data: { name: "Televisions", slug: "televisions", parentId: electronics.id, level: 1, sortOrder: 4, isActive: true },
  });
  const mensClothing = await prisma.category.create({
    data: { name: "Men's Clothing", slug: "mens-clothing", parentId: fashion.id, level: 1, sortOrder: 1, isActive: true },
  });
  const womensClothing = await prisma.category.create({
    data: { name: "Women's Clothing", slug: "womens-clothing", parentId: fashion.id, level: 1, sortOrder: 2, isActive: true },
  });
  const footwear = await prisma.category.create({
    data: { name: "Footwear", slug: "footwear", parentId: fashion.id, level: 1, sortOrder: 3, isActive: true },
  });

  // ==================== ATTRIBUTE TEMPLATES ====================
  await prisma.attributeTemplate.createMany({
    data: [
      { categoryId: mobiles.id, name: "RAM", type: "SELECT", options: JSON.stringify(["4GB", "6GB", "8GB", "12GB", "16GB"]), isVariant: true, sortOrder: 1 },
      { categoryId: mobiles.id, name: "Storage", type: "SELECT", options: JSON.stringify(["64GB", "128GB", "256GB", "512GB"]), isVariant: true, sortOrder: 2 },
      { categoryId: mobiles.id, name: "Color", type: "SELECT", options: JSON.stringify(["Black", "White", "Blue", "Gold", "Silver"]), isVariant: true, sortOrder: 3 },
      { categoryId: mensClothing.id, name: "Size", type: "SELECT", options: JSON.stringify(["XS", "S", "M", "L", "XL", "XXL"]), isVariant: true, sortOrder: 1 },
      { categoryId: mensClothing.id, name: "Color", type: "SELECT", options: JSON.stringify(["Black", "White", "Navy", "Grey", "Red"]), isVariant: true, sortOrder: 2 },
    ],
  });

  // ==================== PRODUCTS ====================
  // Helper to create products with images, inventory, and attributes
  const createProduct = async (data: any) => {
    const { images, inventory, attributes, variants, ...productData } = data;
    const product = await prisma.product.create({ data: productData });
    if (images) {
      await prisma.productImage.createMany({ data: images.map((url: string, i: number) => ({ productId: product.id, url, sortOrder: i })) });
    }
    await prisma.inventory.create({ data: { productId: product.id, quantity: inventory || productData.totalStock, lowStockThreshold: productData.lowStockAlert || 10 } });
    if (attributes) {
      await prisma.productAttribute.createMany({ data: attributes.map((a: any) => ({ ...a, productId: product.id })) });
    }
    return product;
  };

  // --- MOBILES ---
  const p1 = await createProduct({
    title: "Samsung Galaxy S24 Ultra",
    slug: "samsung-galaxy-s24-ultra",
    description: "The ultimate Android flagship with 200MP camera, S Pen, and AI features. Experience the future of mobile photography with advanced night mode, 8K video recording, and all-day battery life.",
    shortDescription: "200MP Camera | S Pen | 12GB RAM | 256GB",
    sellerId: seller1.id,
    categoryId: mobiles.id,
    brandId: samsung.id,
    mrp: 129999,
    price: 109999,
    taxRate: 18,
    totalStock: 45,
    lowStockAlert: 5,
    status: "PUBLISHED",
    isFeatured: true,
    rating: 4.6,
    reviewCount: 234,
    sku: "SGS24U-BLK-256",
    highlights: JSON.stringify(["200MP Main Camera with AI", "Built-in S Pen", "Snapdragon 8 Gen 3", "5000mAh Battery", "6.8\" QHD+ Display"]),
    images: [
      "https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=600",
      "https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=600",
    ],
    attributes: [
      { name: "Processor", value: "Snapdragon 8 Gen 3" },
      { name: "Battery", value: "5000mAh" },
      { name: "Display", value: "6.8\" Dynamic AMOLED 2X, 120Hz" },
      { name: "OS", value: "Android 14 + One UI 6.1" },
      { name: "Rear Camera", value: "200MP + 12MP + 50MP + 10MP" },
      { name: "Front Camera", value: "12MP" },
    ],
  });

  await createProduct({
    title: "Apple iPhone 15 Pro Max",
    slug: "apple-iphone-15-pro-max",
    description: "Apple's most powerful iPhone ever with A17 Pro chip, titanium design, and the most advanced camera system. Shoot 4K ProRes video, explore spatial video, and enjoy USB 3 speeds.",
    shortDescription: "A17 Pro | Titanium | 48MP | USB 3",
    sellerId: seller1.id,
    categoryId: mobiles.id,
    brandId: apple.id,
    mrp: 159900,
    price: 149900,
    taxRate: 18,
    totalStock: 30,
    status: "PUBLISHED",
    isFeatured: true,
    rating: 4.8,
    reviewCount: 512,
    sku: "AIPH15PM-256-BLK",
    highlights: JSON.stringify(["A17 Pro Chip", "Titanium Design", "48MP Main Camera", "USB 3 Speeds", "Action Button"]),
    images: ["https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=600"],
    attributes: [
      { name: "Chip", value: "A17 Pro" },
      { name: "Display", value: "6.7\" Super Retina XDR, 120Hz ProMotion" },
      { name: "Battery", value: "4422mAh" },
      { name: "OS", value: "iOS 17" },
    ],
  });

  await createProduct({
    title: "OnePlus 12 5G",
    slug: "oneplus-12-5g",
    description: "Flagship performance meets Hasselblad camera artistry. The OnePlus 12 combines the Snapdragon 8 Gen 3 processor with a 50MP Hasselblad-tuned triple camera system.",
    shortDescription: "Snapdragon 8 Gen 3 | Hasselblad Camera | 100W Charging",
    sellerId: seller1.id,
    categoryId: mobiles.id,
    brandId: samsung.id,
    mrp: 69999,
    price: 64999,
    taxRate: 18,
    totalStock: 60,
    status: "PUBLISHED",
    rating: 4.5,
    reviewCount: 178,
    sku: "OP12-512-GRN",
    highlights: JSON.stringify(["Snapdragon 8 Gen 3", "Hasselblad Triple Camera", "100W SUPERVOOC", "5400mAh Battery", "LTPO AMOLED Display"]),
    images: ["https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=600"],
    attributes: [
      { name: "Processor", value: "Snapdragon 8 Gen 3" },
      { name: "Battery", value: "5400mAh + 100W Charging" },
      { name: "Display", value: "6.82\" LTPO AMOLED, 120Hz" },
    ],
  });

  // --- LAPTOPS ---
  await createProduct({
    title: "Apple MacBook Air M3",
    slug: "apple-macbook-air-m3",
    description: "MacBook Air M3 delivers incredible performance in an impossibly thin design. With up to 18 hours of battery life and the M3 chip, it's the world's best consumer laptop.",
    shortDescription: "M3 Chip | 8GB RAM | 256GB SSD | 13.6\"",
    sellerId: seller1.id,
    categoryId: laptops.id,
    brandId: apple.id,
    mrp: 114900,
    price: 99900,
    taxRate: 18,
    totalStock: 25,
    status: "PUBLISHED",
    isFeatured: true,
    rating: 4.9,
    reviewCount: 423,
    sku: "MBAM3-8-256-SLV",
    highlights: JSON.stringify(["Apple M3 Chip", "Up to 18 hours battery", "13.6\" Liquid Retina Display", "Fanless design", "MagSafe charging"]),
    images: ["https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=600"],
    attributes: [
      { name: "Processor", value: "Apple M3 (8-core CPU, 10-core GPU)" },
      { name: "RAM", value: "8GB Unified Memory" },
      { name: "Storage", value: "256GB SSD" },
      { name: "Display", value: "13.6\" 2560x1664 Liquid Retina" },
      { name: "Battery", value: "52.6Wh, up to 18 hours" },
      { name: "OS", value: "macOS Sonoma" },
    ],
  });

  await createProduct({
    title: "Dell XPS 15 (2024)",
    slug: "dell-xps-15-2024",
    description: "The Dell XPS 15 packs desktop-class performance in a premium thin chassis with an OLED display option, Intel Core Ultra processor, and NVIDIA RTX 4060 graphics.",
    shortDescription: "Core Ultra 7 | RTX 4060 | 32GB | 1TB SSD",
    sellerId: seller1.id,
    categoryId: laptops.id,
    brandId: samsung.id,
    mrp: 199990,
    price: 179990,
    taxRate: 18,
    totalStock: 15,
    status: "PUBLISHED",
    rating: 4.6,
    reviewCount: 89,
    sku: "DXPS15-32-1TB-BLK",
    highlights: JSON.stringify(["Intel Core Ultra 7 155H", "NVIDIA RTX 4060 8GB", "32GB DDR5 RAM", "15.6\" OLED 3.5K Display", "512GB + 512GB Dual SSD"]),
    images: ["https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=600"],
    attributes: [
      { name: "Processor", value: "Intel Core Ultra 7 155H" },
      { name: "GPU", value: "NVIDIA GeForce RTX 4060 8GB" },
      { name: "RAM", value: "32GB DDR5 5600MHz" },
      { name: "Storage", value: "1TB NVMe SSD" },
      { name: "Display", value: "15.6\" OLED, 3456x2160, 60Hz" },
    ],
  });

  // --- AUDIO ---
  await createProduct({
    title: "Sony WH-1000XM5 Wireless Headphones",
    slug: "sony-wh-1000xm5",
    description: "Industry-leading noise canceling with two chips and eight microphones. 30-hour battery life, lightweight foldable design, and crystal clear hands-free calling.",
    shortDescription: "Industry-leading ANC | 30hr Battery | Multipoint",
    sellerId: seller1.id,
    categoryId: audio.id,
    brandId: sony.id,
    mrp: 29990,
    price: 22990,
    taxRate: 18,
    totalStock: 75,
    status: "PUBLISHED",
    isFeatured: true,
    rating: 4.7,
    reviewCount: 1203,
    sku: "SWXM5-BLK",
    highlights: JSON.stringify(["Best-in-class ANC", "30-hour battery", "LDAC Hi-Res Audio", "Multipoint connection", "Quick Charge (3min = 3hr)"]),
    images: ["https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600"],
    attributes: [
      { name: "Type", value: "Over-Ear, Closed-back" },
      { name: "Battery", value: "30 hours (ANC on)" },
      { name: "Connectivity", value: "Bluetooth 5.2, NFC, 3.5mm" },
      { name: "Weight", value: "250g" },
      { name: "ANC", value: "Dual chip adaptive ANC" },
    ],
  });

  await createProduct({
    title: "boAt Airdopes 141 TWS Earbuds",
    slug: "boat-airdopes-141",
    description: "True wireless earbuds with 42 hours total playback, ENx technology for clear calls, and IPX4 water resistance. Perfect for everyday use.",
    shortDescription: "42H Playback | ENx Tech | IPX4 | Low Latency",
    sellerId: seller1.id,
    categoryId: audio.id,
    brandId: boat.id,
    mrp: 1999,
    price: 899,
    taxRate: 18,
    totalStock: 200,
    status: "PUBLISHED",
    isFlashSale: true,
    flashSalePrice: 799,
    flashSaleEnds: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    rating: 4.1,
    reviewCount: 8923,
    sku: "BADT141-BLU",
    highlights: JSON.stringify(["42H Total Playback", "ENx Technology", "IPX4 Water Resistant", "BEAST Mode Gaming", "Instant Voice Assistant"]),
    images: ["https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=600"],
    attributes: [
      { name: "Driver Size", value: "8mm" },
      { name: "Battery (Earbuds)", value: "5.5 hours" },
      { name: "Battery (Case)", value: "42 hours total" },
      { name: "Connectivity", value: "Bluetooth v5.3" },
      { name: "Water Resistance", value: "IPX4" },
    ],
  });

  await createProduct({
    title: "Apple AirPods Pro (2nd Gen)",
    slug: "apple-airpods-pro-2nd-gen",
    description: "AirPods Pro 2nd generation feature Active Noise Cancellation 2x more powerful than AirPods Pro 1st gen, Adaptive Transparency, and Personalized Spatial Audio.",
    shortDescription: "2x ANC | Adaptive Transparency | H2 Chip",
    sellerId: seller1.id,
    categoryId: audio.id,
    brandId: apple.id,
    mrp: 26900,
    price: 22990,
    taxRate: 18,
    totalStock: 50,
    status: "PUBLISHED",
    rating: 4.6,
    reviewCount: 654,
    sku: "APP2G-WHT",
    highlights: JSON.stringify(["H2 Chip", "2x More ANC", "Adaptive Transparency", "30H Battery with Case", "MagSafe Charging Case"]),
    images: ["https://images.unsplash.com/photo-1603351154351-5e2d0600bb77?w=600"],
    attributes: [
      { name: "Chip", value: "Apple H2" },
      { name: "ANC", value: "Active Noise Cancellation" },
      { name: "Battery", value: "6hrs ANC on, 30hrs with case" },
      { name: "Connectivity", value: "Bluetooth 5.3" },
    ],
  });

  // --- TVs ---
  await createProduct({
    title: "Samsung 55\" 4K QLED Smart TV",
    slug: "samsung-55-qled-4k",
    description: "Quantum dot technology delivers 100% colour volume across the spectrum. With QLED and 4K resolution, enjoy brilliant picture quality with real-life colours.",
    shortDescription: "55\" QLED | 4K | 120Hz | Tizen OS",
    sellerId: seller1.id,
    categoryId: tvCategory.id,
    brandId: samsung.id,
    mrp: 79990,
    price: 54990,
    taxRate: 18,
    totalStock: 20,
    status: "PUBLISHED",
    rating: 4.4,
    reviewCount: 312,
    sku: "SQLED55-4K",
    highlights: JSON.stringify(["Quantum Dot Technology", "4K Ultra HD (3840x2160)", "120Hz Refresh Rate", "Quantum HDR 8X", "Object Tracking Sound Lite"]),
    images: ["https://images.unsplash.com/photo-1593359677879-a4bb92f829e1?w=600"],
    attributes: [
      { name: "Screen Size", value: "55 inches" },
      { name: "Resolution", value: "4K Ultra HD (3840x2160)" },
      { name: "Panel Type", value: "QLED" },
      { name: "Refresh Rate", value: "120Hz" },
      { name: "Smart TV OS", value: "Tizen" },
      { name: "HDMI Ports", value: "3" },
    ],
  });

  // --- FASHION / MEN'S CLOTHING ---
  await createProduct({
    title: "Nike Dri-FIT Men's Running T-Shirt",
    slug: "nike-dri-fit-running-tshirt",
    description: "Nike Dri-FIT technology moves sweat away from your skin for quicker evaporation, keeping you dry and comfortable. Standard fit for a relaxed, easy feel.",
    shortDescription: "Dri-FIT Technology | Lightweight | Anti-Odour",
    sellerId: seller2.id,
    categoryId: mensClothing.id,
    brandId: nike.id,
    mrp: 1995,
    price: 1495,
    taxRate: 5,
    totalStock: 150,
    status: "PUBLISHED",
    rating: 4.3,
    reviewCount: 234,
    sku: "NDT-RUN-BLK-M",
    highlights: JSON.stringify(["Dri-FIT Technology", "Standard Fit", "Lightweight Fabric", "Anti-Odour", "Machine Washable"]),
    images: ["https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600"],
    attributes: [
      { name: "Material", value: "100% Polyester" },
      { name: "Fit", value: "Standard" },
      { name: "Care", value: "Machine Wash" },
      { name: "Occasion", value: "Sports, Gym, Running" },
    ],
  });

  await createProduct({
    title: "Levi's 511 Slim Fit Jeans",
    slug: "levis-511-slim-fit-jeans",
    description: "The 511 slim fit jean sits below the waist and is slim through the seat and thigh, with a narrow leg opening. Perfect for everyday wear with a modern, clean look.",
    shortDescription: "Slim Fit | Below Waist | Stretch Denim",
    sellerId: seller2.id,
    categoryId: mensClothing.id,
    brandId: levis.id,
    mrp: 3599,
    price: 2699,
    taxRate: 5,
    totalStock: 80,
    status: "PUBLISHED",
    rating: 4.4,
    reviewCount: 456,
    sku: "L511-NAVY-32",
    highlights: JSON.stringify(["Slim Fit", "Stretch Denim", "5-Pocket Styling", "Multiple Washes Available", "Iconic Levi's quality"]),
    images: ["https://images.unsplash.com/photo-1542272604-787c3835535d?w=600"],
    attributes: [
      { name: "Fit", value: "Slim" },
      { name: "Material", value: "99% Cotton, 1% Elastane" },
      { name: "Rise", value: "Below Waist" },
      { name: "Leg Opening", value: "14.5 inches" },
    ],
  });

  await createProduct({
    title: "Adidas Men's Tiro 23 Track Pants",
    slug: "adidas-tiro-23-track-pants",
    description: "Tiro track pants with a tapered silhouette and moisture-absorbing AEROREADY technology. Perfect for the gym or a casual look on the street.",
    shortDescription: "AEROREADY | Tapered Fit | Side Zip Pockets",
    sellerId: seller2.id,
    categoryId: mensClothing.id,
    brandId: adidas.id,
    mrp: 2999,
    price: 2199,
    taxRate: 5,
    totalStock: 100,
    status: "PUBLISHED",
    rating: 4.2,
    reviewCount: 187,
    sku: "ADT23-BLK-M",
    highlights: JSON.stringify(["AEROREADY moisture management", "Tapered fit", "Side zip pockets", "Elastic waistband", "Ankle zips"]),
    images: ["https://images.unsplash.com/photo-1562183241-840b8af0721e?w=600"],
    attributes: [
      { name: "Material", value: "100% Polyester (Recycled)" },
      { name: "Fit", value: "Regular/Tapered" },
      { name: "Technology", value: "AEROREADY" },
    ],
  });

  // --- FOOTWEAR ---
  await createProduct({
    title: "Nike Air Max 270",
    slug: "nike-air-max-270",
    description: "The Nike Air Max 270 is inspired by two of Nike's greatest: the Air Max 180 and Air Max 93. It features Nike's largest heel Air unit yet for a super-soft ride.",
    shortDescription: "Air Max 270 Unit | Mesh Upper | Lifestyle",
    sellerId: seller2.id,
    categoryId: footwear.id,
    brandId: nike.id,
    mrp: 11995,
    price: 9495,
    taxRate: 18,
    totalStock: 60,
    status: "PUBLISHED",
    isFeatured: true,
    rating: 4.5,
    reviewCount: 892,
    sku: "NAM270-BLK-9",
    highlights: JSON.stringify(["Max Air 270 Heel Unit", "Mesh and synthetic upper", "Foam midsole", "Rubber outsole", "Lifestyle running"]),
    images: ["https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600"],
    attributes: [
      { name: "Upper Material", value: "Mesh + Synthetic" },
      { name: "Sole", value: "Rubber" },
      { name: "Closure", value: "Lace-Up" },
      { name: "Activity", value: "Lifestyle, Casual" },
    ],
  });

  await createProduct({
    title: "Adidas Ultraboost 23",
    slug: "adidas-ultraboost-23",
    description: "The Ultraboost 23 features a new upper with 30% more support and a midsole made with Parley Ocean Plastic. Experience responsive Boost cushioning like never before.",
    shortDescription: "Boost Technology | Primeknit | Responsive Cushioning",
    sellerId: seller2.id,
    categoryId: footwear.id,
    brandId: adidas.id,
    mrp: 18999,
    price: 14999,
    taxRate: 18,
    totalStock: 40,
    status: "PUBLISHED",
    rating: 4.6,
    reviewCount: 543,
    sku: "AUB23-WHT-10",
    highlights: JSON.stringify(["Primeknit Upper", "BOOST Midsole", "Linear Energy Push System", "Continental Rubber Outsole", "Parley Ocean Plastic"]),
    images: ["https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=600"],
    attributes: [
      { name: "Upper", value: "Primeknit+" },
      { name: "Midsole", value: "BOOST" },
      { name: "Outsole", value: "Continental Rubber" },
      { name: "Category", value: "Running" },
    ],
  });

  await createProduct({
    title: "Puma Suede Classic XXI Sneakers",
    slug: "puma-suede-classic-xxi",
    description: "The PUMA Suede has been a symbol of street style for more than 50 years. The Suede Classic XXI stays true to the original with genuine suede upper and foam midsole.",
    shortDescription: "Suede Upper | Classic Style | Foam Midsole",
    sellerId: seller2.id,
    categoryId: footwear.id,
    brandId: puma.id,
    mrp: 6999,
    price: 4999,
    taxRate: 18,
    totalStock: 55,
    status: "PUBLISHED",
    rating: 4.3,
    reviewCount: 267,
    sku: "PSC21-NVY-8",
    highlights: JSON.stringify(["Genuine Suede Upper", "Classic PUMA Style", "Foam Midsole", "Rubber Outsole", "50+ Years Heritage"]),
    images: ["https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?w=600"],
    attributes: [
      { name: "Upper", value: "Genuine Suede" },
      { name: "Midsole", value: "Foam" },
      { name: "Outsole", value: "Rubber" },
      { name: "Style", value: "Lifestyle/Casual" },
    ],
  });

  // --- SPORTS ---
  await createProduct({
    title: "Adidas Official Match Football",
    slug: "adidas-official-match-football",
    description: "Adidas Official Match Football with thermally bonded panels and FIFA Quality Pro certified. Consistent flight and touch on all playing surfaces.",
    shortDescription: "FIFA Quality Pro | Thermally Bonded | Size 5",
    sellerId: seller2.id,
    categoryId: sports.id,
    brandId: adidas.id,
    mrp: 3999,
    price: 2999,
    taxRate: 12,
    totalStock: 80,
    status: "PUBLISHED",
    rating: 4.4,
    reviewCount: 134,
    sku: "ADFB-SIZE5-WHT",
    highlights: JSON.stringify(["FIFA Quality Pro Certified", "Thermally Bonded Construction", "360 degree spherical shape", "Size 5 (Standard)", "All-weather performance"]),
    images: ["https://images.unsplash.com/photo-1575361204480-aadea25e6e68?w=600"],
    attributes: [
      { name: "Size", value: "5" },
      { name: "Material", value: "Synthetic Leather" },
      { name: "Certification", value: "FIFA Quality Pro" },
      { name: "Panel Construction", value: "Thermally Bonded" },
    ],
  });

  // --- HOME & KITCHEN ---
  await createProduct({
    title: "Instant Pot Duo 7-in-1 Electric Pressure Cooker",
    slug: "instant-pot-duo-7in1",
    description: "The Instant Pot Duo is the #1 selling multi-cooker. It replaces 7 kitchen appliances: pressure cooker, slow cooker, rice maker, yogurt maker, steamer, saute pan, and food warmer.",
    shortDescription: "7-in-1 Multi-Use | 6 Quart | 14 One-Touch Programs",
    sellerId: seller2.id,
    categoryId: homeKitchen.id,
    brandId: samsung.id,
    mrp: 9999,
    price: 6999,
    taxRate: 18,
    totalStock: 35,
    status: "PUBLISHED",
    rating: 4.7,
    reviewCount: 2341,
    sku: "IPD-6QT-SS",
    highlights: JSON.stringify(["7-in-1 Multi-Use Cooker", "6 Quart Capacity", "14 Smart Programs", "Up to 70% faster cooking", "UL safety certified"]),
    images: ["https://images.unsplash.com/photo-1585515320310-259814833e62?w=600"],
    attributes: [
      { name: "Capacity", value: "6 Quart (5.7 Liters)" },
      { name: "Functions", value: "7-in-1" },
      { name: "Wattage", value: "1000W" },
      { name: "Material", value: "Stainless Steel Inner Pot" },
    ],
  });

  // --- BOOKS ---
  await createProduct({
    title: "Atomic Habits by James Clear",
    slug: "atomic-habits-james-clear",
    description: "A proven framework for improving every day. James Clear, one of the world's leading experts on habit formation, reveals practical strategies to form good habits and break bad ones.",
    shortDescription: "Paperback | Self-Help | 320 Pages",
    sellerId: seller2.id,
    categoryId: books.id,
    mrp: 799,
    price: 499,
    taxRate: 0,
    totalStock: 200,
    status: "PUBLISHED",
    isFeatured: true,
    rating: 4.8,
    reviewCount: 5621,
    sku: "BK-ATHAB-PAP",
    highlights: JSON.stringify(["#1 New York Times Bestseller", "320 Pages", "Paperback Edition", "Proven framework", "Used by Olympic coaches and Fortune 500 companies"]),
    images: ["https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=600"],
    attributes: [
      { name: "Author", value: "James Clear" },
      { name: "Format", value: "Paperback" },
      { name: "Pages", value: "320" },
      { name: "Language", value: "English" },
      { name: "Publisher", value: "Random House Business" },
    ],
  });

  await createProduct({
    title: "The Psychology of Money",
    slug: "psychology-of-money-morgan-housel",
    description: "Timeless lessons on wealth, greed, and happiness doing well with money isn't necessarily about what you know. Morgan Housel shows how your personal history shapes your views on money.",
    shortDescription: "Paperback | Finance | 256 Pages",
    sellerId: seller2.id,
    categoryId: books.id,
    mrp: 699,
    price: 399,
    taxRate: 0,
    totalStock: 180,
    status: "PUBLISHED",
    rating: 4.7,
    reviewCount: 3214,
    sku: "BK-PSYMNY-PAP",
    highlights: JSON.stringify(["International Bestseller", "256 Pages", "Personal Finance", "19 short stories", "Used in top MBA programs"]),
    images: ["https://images.unsplash.com/photo-1592496431122-2349e0fbc666?w=600"],
    attributes: [
      { name: "Author", value: "Morgan Housel" },
      { name: "Format", value: "Paperback" },
      { name: "Pages", value: "256" },
      { name: "Language", value: "English" },
      { name: "Publisher", value: "Harriman House" },
    ],
  });

  // More products to reach ~20+ total for variety
  await createProduct({
    title: "Samsung 8GB DDR5 RAM",
    slug: "samsung-8gb-ddr5-ram",
    description: "Samsung 8GB DDR5-4800MHz desktop RAM. Upgrade your system with faster memory speeds and improved performance for gaming, content creation, and multitasking.",
    shortDescription: "8GB | DDR5-4800 | Desktop | CL40",
    sellerId: seller1.id,
    categoryId: electronics.id,
    brandId: samsung.id,
    mrp: 3999,
    price: 2999,
    taxRate: 18,
    totalStock: 100,
    status: "PUBLISHED",
    rating: 4.5,
    reviewCount: 234,
    sku: "SRAM8-DDR5",
    highlights: JSON.stringify(["DDR5 Technology", "4800MHz Speed", "CL40 Latency", "1.1V Voltage", "Desktop Form Factor"]),
    images: ["https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?w=600"],
    attributes: [
      { name: "Capacity", value: "8GB" },
      { name: "Type", value: "DDR5" },
      { name: "Speed", value: "4800MHz" },
      { name: "Form Factor", value: "DIMM (Desktop)" },
    ],
  });

  await createProduct({
    title: "boAt Stone 650 Bluetooth Speaker",
    slug: "boat-stone-650-bluetooth-speaker",
    description: "10W dual driver stereo sound with 100% Splash Proof & Dustproof design. Up to 7 hours playtime, TWS mode, and built-in mic for hands-free calls.",
    shortDescription: "10W | IPX7 | 7H Battery | TWS Mode",
    sellerId: seller1.id,
    categoryId: audio.id,
    brandId: boat.id,
    mrp: 3999,
    price: 1499,
    taxRate: 18,
    totalStock: 120,
    status: "PUBLISHED",
    isFlashSale: true,
    flashSalePrice: 1299,
    flashSaleEnds: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    rating: 4.0,
    reviewCount: 4521,
    sku: "BST650-BLK",
    highlights: JSON.stringify(["10W Dual Drivers", "IPX7 Waterproof", "7H Battery", "TWS Mode", "Dedicated Bass Port"]),
    images: ["https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=600"],
    attributes: [
      { name: "Output", value: "10W" },
      { name: "Battery", value: "7 hours" },
      { name: "Water Resistance", value: "IPX7" },
      { name: "Connectivity", value: "Bluetooth 5.0" },
    ],
  });

  // --- GENERATE EXPANDED CATALOG UP TO 100 PRODUCTS ---
  const currentCount = await prisma.product.count();
  const targetCount = 100;
  const catalogTemplates = [
    { cat: audio, brand: sony, prefix: "Sony WH-CH", suffix: "Wireless Over-Ear Headphones", basePrice: 4999, baseMrp: 9990, img: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600" },
    { cat: mobiles, brand: samsung, prefix: "Samsung Galaxy M", suffix: "5G Smartphone", basePrice: 14999, baseMrp: 19999, img: "https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=600" },
    { cat: laptops, brand: apple, prefix: "MacBook Pro M3", suffix: "Liquid Retina XDR Laptop", basePrice: 169900, baseMrp: 199900, img: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=600" },
    { cat: footwear, brand: nike, prefix: "Nike Air Zoom Pegasus", suffix: "Road Running Shoes", basePrice: 6495, baseMrp: 9995, img: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600" },
    { cat: footwear, brand: adidas, prefix: "Adidas Ultraboost Light", suffix: "Performance Running Shoes", basePrice: 7999, baseMrp: 14999, img: "https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?w=600" },
    { cat: footwear, brand: puma, prefix: "Puma RS-X Geek", suffix: "Retro Chunky Sneakers", basePrice: 3899, baseMrp: 6999, img: "https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=600" },
    { cat: mensClothing, brand: levis, prefix: "Levi's 511 Slim Fit", suffix: "Stretchable Denim Jeans", basePrice: 2299, baseMrp: 3999, img: "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=600" },
    { cat: mensClothing, brand: nike, prefix: "Nike Dri-FIT Legend", suffix: "Athletic Training T-Shirt", basePrice: 1295, baseMrp: 1795, img: "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=600" },
    { cat: womensClothing, brand: adidas, prefix: "Adidas Essentials 3-Stripes", suffix: "French Terry Hoodie", basePrice: 2499, baseMrp: 4599, img: "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=600" },
    { cat: homeKitchen, brand: sony, prefix: "Smart Ambient Mood Lamp", suffix: "App-Controlled RGB Lighting", basePrice: 1899, baseMrp: 3499, img: "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=600" },
    { cat: homeKitchen, brand: samsung, prefix: "Ultra-Quiet Ceramic Air Purifier", suffix: "HEPA H13 Filter", basePrice: 8990, baseMrp: 14990, img: "https://images.unsplash.com/photo-1585338107529-13afc5f02586?w=600" },
    { cat: sports, brand: puma, prefix: "Puma Challenger Pro Duffle", suffix: "Water-Resistant Gym Bag", basePrice: 1499, baseMrp: 2999, img: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600" },
    { cat: audio, brand: boat, prefix: "boAt Airdopes 141 ANC", suffix: "TWS Earbuds 42H Playback", basePrice: 1299, baseMrp: 4490, img: "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=600" },
    { cat: tvCategory, brand: sony, prefix: "Sony Bravia 55\" 4K Ultra HD", suffix: "Google TV Dolby Atmos", basePrice: 57990, baseMrp: 84900, img: "https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=600" },
  ];

  for (let i = currentCount; i < targetCount; i++) {
    const tmpl = catalogTemplates[i % catalogTemplates.length];
    const modelNum = Math.floor(i * 7 + 101);
    const seller = i % 2 === 0 ? seller1 : seller2;
    const price = tmpl.basePrice + (i % 5) * 200;
    const mrp = Math.round(price * 1.35);
    const title = `${tmpl.prefix} ${modelNum} ${tmpl.suffix}`;
    const slug = `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${i}`;

    await createProduct({
      title,
      slug,
      description: `Experience exceptional quality with the all-new ${title}. Built with cutting-edge engineering, premium materials, and certified durability for discerning buyers in India.`,
      shortDescription: `Authentic ${tmpl.brand.name} · Fast Nationwide Dispatch · 1-Year Warranty`,
      sellerId: seller.id,
      categoryId: tmpl.cat.id,
      brandId: tmpl.brand.id,
      mrp,
      price,
      taxRate: 18,
      totalStock: Math.floor(Math.random() * 80) + 15,
      lowStockAlert: 10,
      status: "PUBLISHED",
      isFeatured: i % 7 === 0,
      rating: parseFloat((4.0 + (i % 10) * 0.1).toFixed(1)),
      reviewCount: Math.floor(Math.random() * 450) + 12,
      sku: `SKU-${tmpl.brand.name.substring(0, 3).toUpperCase()}-${modelNum}-${i}`,
      highlights: JSON.stringify([
        "Genuine 100% Authentic Product",
        "Free 3-4 Day SuperFast Delivery",
        "10-Day Replacement Guarantee",
        "Official Brand Warranty Included"
      ]),
      images: [tmpl.img],
      attributes: [
        { name: "Brand", value: tmpl.brand.name },
        { name: "Country of Origin", value: "India" },
        { name: "Warranty", value: "1 Year Domestic Warranty" },
      ],
    });
  }

  // Get all products for reference
  const allProducts = await prisma.product.findMany({ include: { images: true } });

  // ==================== REVIEWS ====================
  const reviews = [
    { rating: 5, title: "Absolutely love this!", body: "Exceeded all my expectations. Great build quality and performance." },
    { rating: 4, title: "Very good product", body: "Works as advertised. Minor packaging issues but product is great." },
    { rating: 5, title: "Best purchase this year", body: "The quality is outstanding. Fast delivery and excellent packaging." },
    { rating: 3, title: "Decent but not great", body: "Gets the job done but the competition offers better value." },
    { rating: 4, title: "Recommended!", body: "Happy with the purchase. Good value for money at this price point." },
    { rating: 5, title: "Premium quality", body: "You can feel the premium quality the moment you unbox it. Worth every rupee." },
  ];

  for (let i = 0; i < Math.min(allProducts.length, 6); i++) {
    const review = reviews[i % reviews.length];
    await prisma.review.create({
      data: {
        productId: allProducts[i].id,
        userId: i % 2 === 0 ? customer1.id : customer2.id,
        rating: review.rating,
        title: review.title,
        body: review.body,
        isVerified: true,
        isApproved: true,
      },
    });
  }

  // ==================== COUPONS ====================
  await prisma.coupon.createMany({
    data: [
      { code: "WELCOME10", type: "PERCENTAGE", value: 10, minCartValue: 500, description: "10% off on first order", usageLimit: 1000, isActive: true },
      { code: "FLAT200", type: "FIXED", value: 200, minCartValue: 1000, description: "Flat ₹200 off on orders above ₹1000", usageLimit: 500, isActive: true },
      { code: "FREESHIP", type: "FIXED", value: 40, minCartValue: 299, description: "Free shipping coupon on orders above ₹299", isActive: true },
      { code: "TECH15", type: "PERCENTAGE", value: 15, minCartValue: 5000, maxDiscount: 2000, description: "15% off on electronics (max ₹2000)", usageLimit: 200, isActive: true },
      { code: "FASHION20", type: "PERCENTAGE", value: 20, minCartValue: 1000, maxDiscount: 500, description: "20% off on fashion items", usageLimit: 300, isActive: true },
    ],
  });

  // ==================== BANNERS ====================
  await prisma.banner.createMany({
    data: [
      { title: "Year's Biggest Electronics Sale", subtitle: "Up to 70% off on mobiles, laptops & more", image: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200", link: "/categories/electronics", placement: "HERO", sortOrder: 1, isActive: true },
      { title: "Fashion Festival", subtitle: "Flat 50% off on top brands", image: "https://images.unsplash.com/photo-1445205170230-053b83016050?w=1200", link: "/categories/fashion", placement: "HERO", sortOrder: 2, isActive: true },
      { title: "Home Makeover Sale", subtitle: "Best deals on home & kitchen appliances", image: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=1200", link: "/categories/home-kitchen", placement: "HERO", sortOrder: 3, isActive: true },
      { title: "Flash Sale: Audio Deals", subtitle: "Limited time offers on headphones & speakers", image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=1200", link: "/categories/audio-headphones", placement: "FLASH_SALE", sortOrder: 4, isActive: true },
    ],
  });

  // ==================== ORDERS ====================
  const orderStatuses = [
    "DELIVERED", "DELIVERED", "SHIPPED", "PROCESSING", "CONFIRMED",
    "PLACED", "CANCELLED", "DELIVERED", "DELIVERED", "OUT_FOR_DELIVERY",
  ] as const;

  for (let i = 0; i < 10; i++) {
    const product = allProducts[i % allProducts.length];
    const qty = Math.floor(Math.random() * 3) + 1;
    const itemTotal = product.price * qty;
    const tax = itemTotal * (product.taxRate / 100);
    const total = itemTotal + tax;
    const status = orderStatuses[i];
    const user = i % 2 === 0 ? customer1 : customer2;
    const address = i % 2 === 0 ? address1 : address2;

    const order = await prisma.order.create({
      data: {
        orderNumber: `SZ${Date.now().toString(36).toUpperCase()}${i}`,
        userId: user.id,
        addressId: address.id,
        status,
        paymentStatus: status === "CANCELLED" ? "REFUNDED" : status === "PLACED" ? "PENDING" : "PAID",
        paymentMethod: "CASHFREE_LINK",
        subtotal: itemTotal,
        tax,
        total,
        deliveryFee: itemTotal > 499 ? 0 : 40,
        createdAt: new Date(Date.now() - (i * 3 * 24 * 60 * 60 * 1000)),
        items: {
          create: [{
            productId: product.id,
            title: product.title,
            image: product.images?.[0]?.url || "",
            price: product.price,
            mrp: product.mrp,
            quantity: qty,
            tax,
            total: itemTotal,
            sellerId: product.sellerId,
            status,
          }],
        },
        statusHistory: {
          create: [
            { status: "PLACED", createdAt: new Date(Date.now() - (i * 3 * 24 * 60 * 60 * 1000)) },
            ...(status !== "PLACED" ? [{ status: "CONFIRMED", createdAt: new Date(Date.now() - (i * 3 * 24 * 60 * 60 * 1000 - 3600000)) }] : []),
          ],
        },
      },
    });

    // Create payment record
    await prisma.payment.create({
      data: {
        orderId: order.id,
        method: "CASHFREE_LINK",
        status: order.paymentStatus === "PAID" ? "PAID" : order.paymentStatus === "PENDING" ? "PENDING" : "REFUNDED",
        amount: total,
        paidAt: order.paymentStatus === "PAID" ? new Date() : null,
      },
    });
  }

  // ==================== CMS PAGES ====================
  await prisma.cmsPage.createMany({
    data: [
      { title: "About Us", slug: "about", content: "<h1>About ShopZen</h1><p>ShopZen is India's leading multi-vendor marketplace connecting millions of buyers and sellers across the country.</p>", isActive: true },
      { title: "Terms of Service", slug: "terms", content: "<h1>Terms of Service</h1><p>By using ShopZen, you agree to these terms and conditions.</p>", isActive: true },
      { title: "Privacy Policy", slug: "privacy", content: "<h1>Privacy Policy</h1><p>We take your privacy seriously. This policy explains how we collect and use your data.</p>", isActive: true },
      { title: "Return Policy", slug: "return-policy", content: "<h1>Return Policy</h1><p>Easy 30-day returns on most products. See details for exceptions.</p>", isActive: true },
    ],
  });

  // ==================== SETTINGS ====================
  await prisma.setting.createMany({
    data: [
      { key: "site_name", value: "ShopZen", category: "GENERAL" },
      { key: "site_tagline", value: "Shop Everything, Everywhere", category: "GENERAL" },
      { key: "currency", value: "INR", category: "GENERAL" },
      { key: "currency_symbol", value: "₹", category: "GENERAL" },
      { key: "free_shipping_threshold", value: "499", category: "SHIPPING" },
      { key: "default_shipping_fee", value: "40", category: "SHIPPING" },
      { key: "default_tax_rate", value: "18", category: "TAX" },
      { key: "cashfree_enabled", value: "true", category: "PAYMENT" },
      { key: "cashfree_payment_link", value: "https://cfpe.me/krishnadas", category: "PAYMENT" },
      { key: "support_email", value: "support@shopzen.com", category: "CONTACT" },
      { key: "support_phone", value: "1800-123-4567", category: "CONTACT" },
    ],
  });

  // ==================== NEWSLETTER ====================
  await prisma.newsletterSubscriber.createMany({
    data: [
      { email: "newsletter1@example.com" },
      { email: "newsletter2@example.com" },
      { email: "newsletter3@example.com" },
    ],
  }).catch(() => {});

  // ==================== SALE CAMPAIGN ====================
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

  console.log("✅ Seed completed successfully!");
  console.log("\n📋 Login Credentials:");
  console.log("  Super Admin: admin@shopzen.com / Admin@123");
  console.log("  Seller 1:    seller1@shopzen.com / Seller@123");
  console.log("  Seller 2:    seller2@shopzen.com / Seller@123");
  console.log("  Customer 1:  customer1@shopzen.com / Customer@123");
  console.log("  Customer 2:  customer2@shopzen.com / Customer@123");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
