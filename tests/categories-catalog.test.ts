import { describe, it, expect } from "vitest";
import { CATEGORIES_TAXONOMY } from "@/lib/categories-data";

describe("Categories & Catalog Taxonomy System", () => {
  it("defines exactly 12 main marketplace categories", () => {
    expect(CATEGORIES_TAXONOMY).toHaveLength(12);
    const expectedCategories = [
      "Mobiles & Accessories",
      "Electronics & Computers",
      "Fashion & Lifestyle",
      "Home Appliances & Kitchen",
      "Furniture & Home Decor",
      "Beauty & Personal Care",
      "Grocery & Household Essentials",
      "Books, Stationery & Education",
      "Sports, Fitness & Outdoors",
      "Toys, Baby & Kids",
      "Automotive & Travel",
      "Tools, Industrial & Other Products",
    ];
    const actualNames = CATEGORIES_TAXONOMY.map((c) => c.name);
    expect(actualNames).toEqual(expectedCategories);
  });

  it("contains more than 290 granular subcategories across the 12 departments", () => {
    const totalSubs = CATEGORIES_TAXONOMY.reduce((sum, c) => sum + c.subcategories.length, 0);
    expect(totalSubs).toBeGreaterThanOrEqual(290);
  });

  it("has completely unique slugs across all main categories and subcategories", () => {
    const slugSet = new Set<string>();
    for (const cat of CATEGORIES_TAXONOMY) {
      expect(slugSet.has(cat.slug)).toBe(false);
      slugSet.add(cat.slug);

      for (const sub of cat.subcategories) {
        expect(slugSet.has(sub.slug)).toBe(false);
        slugSet.add(sub.slug);
      }
    }
    expect(slugSet.size).toBe(12 + CATEGORIES_TAXONOMY.reduce((s, c) => s + c.subcategories.length, 0));
  });

  it("ensures each subcategory has a positive displayOrder and non-empty name", () => {
    for (const cat of CATEGORIES_TAXONOMY) {
      expect(cat.displayOrder).toBeGreaterThan(0);
      expect(cat.name.trim().length).toBeGreaterThan(0);
      for (const sub of cat.subcategories) {
        expect(sub.displayOrder).toBeGreaterThan(0);
        expect(sub.name.trim().length).toBeGreaterThan(0);
        expect(sub.slug).toMatch(/^[a-z0-9-]+$/);
      }
    }
  });

  it("verifies required Flipkart-inspired departments are present with correct core subcategories", () => {
    const mobiles = CATEGORIES_TAXONOMY.find((c) => c.slug === "mobiles-accessories");
    expect(mobiles).toBeDefined();
    const mobileSubSlugs = mobiles?.subcategories.map((s) => s.slug);
    expect(mobileSubSlugs).toContain("smartphones");
    expect(mobileSubSlugs).toContain("chargers-adapters");
    expect(mobileSubSlugs).toContain("power-banks");

    const electronics = CATEGORIES_TAXONOMY.find((c) => c.slug === "electronics-computers");
    expect(electronics).toBeDefined();
    const elecSubSlugs = electronics?.subcategories.map((s) => s.slug);
    expect(elecSubSlugs).toContain("laptops");
    expect(elecSubSlugs).toContain("headphones-earbuds");
    expect(elecSubSlugs).toContain("smartwatches");

    const fashion = CATEGORIES_TAXONOMY.find((c) => c.slug === "fashion-lifestyle");
    expect(fashion).toBeDefined();
    const fashionSubSlugs = fashion?.subcategories.map((s) => s.slug);
    expect(fashionSubSlugs).toContain("sneakers");
    expect(fashionSubSlugs).toContain("watches");
  });
});
