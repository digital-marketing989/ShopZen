"use client";

import { useState, useEffect } from "react";
import {
  Package,
  Plus,
  Search,
  Trash2,
  ExternalLink,
  Copy,
  Download,
  Upload,
  RotateCcw,
  Check,
  X,
  Filter,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

export default function AdminProductsPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);

  // CSV Import State
  const [showImportModal, setShowImportModal] = useState(false);
  const [csvText, setCsvText] = useState("");
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);

  // New product form
  const [form, setForm] = useState({
    title: "",
    price: "",
    mrp: "",
    totalStock: "25",
    categoryId: "",
    image: "",
    description: "",
  });

  const fetchProducts = async () => {
    try {
      const [prodRes, catRes] = await Promise.all([
        fetch("/api/products?limit=100"),
        fetch("/api/categories?flat=true"),
      ]);
      const prodData = await prodRes.json();
      const catData = await catRes.json();
      if (prodData.success) setProducts(prodData.data.products);
      if (catData.categories) {
        setCategories(catData.categories);
        if (catData.categories[0]) {
          setForm((prev) => ({ ...prev, categoryId: catData.categories[0].id }));
        }
      }
    } catch {
      toast.error("Failed to load products");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.price || !form.mrp || !form.categoryId) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          price: Number(form.price),
          mrp: Number(form.mrp),
          totalStock: Number(form.totalStock),
          categoryId: form.categoryId,
          description: form.description,
          images: form.image ? [form.image] : [],
          status: "PUBLISHED",
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create product");

      toast.success("Product created successfully!");
      setShowAddModal(false);
      setForm({
        title: "",
        price: "",
        mrp: "",
        totalStock: "25",
        categoryId: categories[0]?.id || "",
        image: "",
        description: "",
      });
      fetchProducts();
    } catch (err: any) {
      toast.error(err.message || "Failed to create product");
    }
  };

  const handleDuplicateProduct = async (product: any) => {
    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `${product.title} (Copy)`,
          price: product.price,
          mrp: product.mrp,
          totalStock: product.totalStock,
          categoryId: product.category?.id || categories[0]?.id,
          description: product.description,
          images: product.images?.map((img: any) => img.url) || [],
          status: "DRAFT",
        }),
      });

      if (res.ok) {
        toast.success("Product duplicated as DRAFT");
        fetchProducts();
      } else {
        toast.error("Failed to duplicate product");
      }
    } catch {
      toast.error("Network error");
    }
  };

  const handleToggleStatus = async (product: any) => {
    const nextStatus = product.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED";
    try {
      const res = await fetch(`/api/products/${product.slug}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });

      if (res.ok) {
        toast.success(`Product status updated to ${nextStatus}`);
        setProducts(
          products.map((p) => (p.id === product.id ? { ...p, status: nextStatus } : p))
        );
      }
    } catch {
      toast.error("Failed to update status");
    }
  };

  const handleDeleteProduct = async (slug: string) => {
    if (!confirm("Are you sure you want to soft delete this product?")) return;

    try {
      const res = await fetch(`/api/products/${slug}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Product deleted");
        setProducts(products.filter((p) => p.slug !== slug && p.id !== slug));
      } else {
        toast.error("Failed to delete product");
      }
    } catch {
      toast.error("Network error");
    }
  };

  const handleBulkDelete = () => {
    if (!confirm(`Delete ${selectedIds.length} selected products?`)) return;
    setProducts(products.filter((p) => !selectedIds.includes(p.id)));
    setSelectedIds([]);
    toast.success("Selected products deleted");
  };

  const exportCSV = () => {
    const headers = ["ID", "Title", "Category", "Price", "MRP", "Stock", "Status"];
    const rows = filtered.map((p) => [
      p.id,
      `"${p.title.replace(/"/g, '""')}"`,
      p.category?.name || "General",
      p.price,
      p.mrp,
      p.totalStock,
      p.status,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `shopzen_catalog_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Products catalog exported to CSV");
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filtered.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filtered.map((p) => p.id));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!csvText.trim()) {
      toast.error("Please provide CSV data");
      return;
    }

    setImporting(true);
    setImportResult(null);
    try {
      const res = await fetch("/api/admin/products/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csvText }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Import failed");

      setImportResult(data);
      toast.success(data.message || "Import batch processed");
      fetchProducts();
    } catch (err: any) {
      toast.error(err.message || "Import failed");
    } finally {
      setImporting(false);
    }
  };

  const filtered = products.filter((p) => {
    const matchesSearch = p.title.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || p.status === statusFilter;
    const matchesCategory =
      categoryFilter === "ALL" ||
      p.categoryId === categoryFilter ||
      p.category?.slug === categoryFilter ||
      p.category?.parentId === categoryFilter;
    return matchesSearch && matchesStatus && matchesCategory;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">
            Products Catalog
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Manage marketplace inventory, pricing, bulk exports, and listings.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setImportResult(null);
              setShowImportModal(true);
            }}
            className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-800 px-3 py-2 text-xs font-bold shadow-sm transition"
          >
            <Upload className="w-3.5 h-3.5 text-purple-600" />
            <span>Import CSV</span>
          </button>

          <button
            onClick={exportCSV}
            className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-800 px-3 py-2 text-xs font-bold shadow-sm transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-xs font-bold shadow-md transition"
          >
            <Plus className="w-4 h-4" />
            <span>Add Product</span>
          </button>
        </div>
      </div>

      {/* Filter, Search & Bulk Actions Bar */}
      <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="flex items-center gap-3 w-full sm:w-auto flex-1">
          <Search className="w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search products by title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-xs text-gray-900 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-3 text-xs w-full sm:w-auto justify-between sm:justify-end">
          {selectedIds.length > 0 && (
            <button
              onClick={handleBulkDelete}
              className="px-3 py-1.5 rounded-lg bg-red-50 text-red-700 border border-red-200 font-bold hover:bg-red-100 transition"
            >
              Delete Selected ({selectedIds.length})
            </button>
          )}

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-lg border border-gray-200 px-3 py-1.5 font-semibold text-gray-700 focus:outline-none max-w-[180px] truncate"
          >
            <option value="ALL">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.parent ? `— ${c.name}` : c.name}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-gray-200 px-3 py-1.5 font-semibold text-gray-700 focus:outline-none"
          >
            <option value="ALL">All Statuses</option>
            <option value="PUBLISHED">Published</option>
            <option value="DRAFT">Draft</option>
            <option value="ARCHIVED">Archived</option>
          </select>
        </div>
      </div>

      {/* Products Table */}
      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-600">
            <thead className="bg-gray-50 text-[11px] font-bold uppercase tracking-wider text-gray-500 border-b border-gray-100">
              <tr>
                <th className="p-4 w-10">
                  <input
                    type="checkbox"
                    checked={selectedIds.length === filtered.length && filtered.length > 0}
                    onChange={toggleSelectAll}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                </th>
                <th className="p-4">Product</th>
                <th className="p-4">Category</th>
                <th className="p-4">Price</th>
                <th className="p-4">Stock</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((prod) => {
                const isSelected = selectedIds.includes(prod.id);

                return (
                  <tr
                    key={prod.id}
                    className={`hover:bg-gray-50/60 transition ${
                      isSelected ? "bg-blue-50/30" : ""
                    }`}
                  >
                    <td className="p-4">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectOne(prod.id)}
                        className="rounded text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                    <td className="p-4 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gray-50 border border-gray-100 p-1 flex-shrink-0 flex items-center justify-center">
                        <img
                          src={
                            prod.images?.[0]?.url ||
                            "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=100&q=80"
                          }
                          alt=""
                          className="max-h-full max-w-full object-contain"
                        />
                      </div>
                      <div className="max-w-xs">
                        <p className="font-bold text-gray-900 line-clamp-1">
                          {prod.title}
                        </p>
                        <p className="text-[10px] text-gray-400 font-mono">
                          {prod.id}
                        </p>
                      </div>
                    </td>
                    <td className="p-4 font-medium text-gray-700">
                      {prod.category?.name || "General"}
                    </td>
                    <td className="p-4">
                      <span className="font-extrabold text-gray-950">
                        ₹{prod.price.toLocaleString("en-IN")}
                      </span>
                      {prod.mrp > prod.price && (
                        <span className="ml-1.5 text-[10px] text-gray-400 line-through">
                          ₹{prod.mrp.toLocaleString("en-IN")}
                        </span>
                      )}
                    </td>
                    <td className="p-4">
                      <span
                        className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                          prod.totalStock > 10
                            ? "bg-emerald-50 text-emerald-700"
                            : prod.totalStock > 0
                            ? "bg-amber-50 text-amber-700"
                            : "bg-red-50 text-red-700"
                        }`}
                      >
                        {prod.totalStock} in stock
                      </span>
                    </td>
                    <td className="p-4">
                      <button
                        onClick={() => handleToggleStatus(prod)}
                        className={`font-semibold text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border transition ${
                          prod.status === "PUBLISHED"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                            : "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100"
                        }`}
                        title="Click to toggle status"
                      >
                        {prod.status}
                      </button>
                    </td>
                    <td className="p-4 text-right space-x-2">
                      <button
                        onClick={() => handleDuplicateProduct(prod)}
                        className="p-1.5 text-gray-400 hover:text-indigo-600 inline-block"
                        title="Duplicate Product"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <Link
                        href={`/product/${prod.slug}`}
                        target="_blank"
                        className="p-1.5 text-gray-400 hover:text-blue-600 inline-block"
                        title="View on Store"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Link>
                      <button
                        onClick={() => handleDeleteProduct(prod.slug)}
                        className="p-1.5 text-gray-400 hover:text-red-600 inline-block"
                        title="Delete Product"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Product Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="font-bold text-gray-900 text-sm">Add New Product</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateProduct} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-gray-700">Product Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Wireless Noise Cancelling Headphones"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-gray-200 p-2 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-gray-700">Selling Price (₹) *</label>
                  <input
                    type="number"
                    required
                    placeholder="2499"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-gray-200 p-2 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="font-semibold text-gray-700">MRP (₹) *</label>
                  <input
                    type="number"
                    required
                    placeholder="4999"
                    value={form.mrp}
                    onChange={(e) => setForm({ ...form, mrp: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-gray-200 p-2 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-gray-700">Category *</label>
                  <select
                    value={form.categoryId}
                    onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-gray-200 p-2 focus:ring-1 focus:ring-blue-500"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-gray-700">Stock Quantity</label>
                  <input
                    type="number"
                    value={form.totalStock}
                    onChange={(e) => setForm({ ...form, totalStock: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-gray-200 p-2 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-gray-700">Image URL</label>
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/..."
                  value={form.image}
                  onChange={(e) => setForm({ ...form, image: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-gray-200 p-2 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="font-semibold text-gray-700">Description</label>
                <textarea
                  rows={3}
                  placeholder="Detailed product highlights..."
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-gray-200 p-2 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold"
                >
                  Create Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Product CSV Importer Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                  <Upload className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-black text-gray-900 text-base">Bulk Product Catalog Importer</h3>
                  <p className="text-[11px] text-gray-500">
                    Accepts verified supplier feeds, open datasets & merchant CSVs. Imported products are kept in DRAFT.
                  </p>
                </div>
              </div>
              <button onClick={() => setShowImportModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleImportSubmit} className="space-y-4 text-xs">
              <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 text-purple-900 space-y-1">
                <p className="font-bold">Supported Columns (Header required):</p>
                <p className="font-mono text-[11px]">
                  title, mrp, price, costPrice, category, brand, sku, stock, image, description
                </p>
                <p className="text-[10px] text-purple-700">
                  Category matches any of the 12 main categories or 290+ subcategories by slug, ID, or name.
                </p>
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">Paste CSV Data or Drag & Drop File</label>
                <textarea
                  rows={8}
                  placeholder={`title,mrp,price,category,brand,sku,stock,description&#10;"boAt BassHeads 100",999,399,headphones-earbuds,boAt,BOAT-BH100,50,"Super extra bass wired earphones"`}
                  value={csvText}
                  onChange={(e) => setCsvText(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 p-3 font-mono text-[11px] outline-none focus:border-purple-600"
                />
              </div>

              {/* Import Result Summary */}
              {importResult && (
                <div className={`p-4 rounded-xl border text-xs ${
                  importResult.failedRows === 0 ? "bg-emerald-50 border-emerald-200 text-emerald-950" : "bg-amber-50 border-amber-200 text-amber-950"
                }`}>
                  <div className="font-black text-sm mb-1">
                    {importResult.message}
                  </div>
                  <div className="grid grid-cols-3 gap-2 mt-2 font-mono text-[11px]">
                    <div>Total: {importResult.totalRows}</div>
                    <div className="text-emerald-700 font-bold">Imported to DRAFT: {importResult.successfulRows}</div>
                    <div className="text-red-600 font-bold">Failed: {importResult.failedRows}</div>
                  </div>
                  {importResult.errors && importResult.errors.length > 0 && (
                    <div className="mt-3 max-h-32 overflow-y-auto bg-white p-2 rounded-lg border border-amber-300 font-mono text-[10px] space-y-0.5">
                      <div className="font-bold text-red-600">Failed Rows Report:</div>
                      {importResult.errors.map((err: any, idx: number) => (
                        <div key={idx} className="text-gray-700">
                          Row {err.row}: {err.title ? `"${err.title}" - ` : ""}{err.error}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowImportModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 font-bold"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={importing}
                  className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-black shadow-md shadow-purple-500/20 disabled:opacity-50"
                >
                  {importing ? "Processing Batch..." : "Run Batch Import"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
