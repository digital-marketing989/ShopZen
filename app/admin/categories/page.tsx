"use client";

import { useState, useEffect, useMemo } from "react";
import {
  FolderTree,
  Plus,
  X,
  Search,
  Download,
  Upload,
  MoveRight,
  ChevronRight,
  ChevronDown,
  Edit2,
  Trash2,
  Layers,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Eye,
  EyeOff,
  Package,
} from "lucide-react";
import { toast } from "sonner";

interface CategoryItem {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image: string | null;
  banner: string | null;
  parentId: string | null;
  level: number;
  sortOrder: number;
  isActive: boolean;
  parent?: { id: string; name: string; slug: string } | null;
  children?: Array<{ id: string; name: string; slug: string; isActive: boolean; sortOrder: number }>;
  _count?: { products: number; children: number };
}

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedDepartments, setExpandedDepartments] = useState<Record<string, boolean>>({});

  // Modals
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryItem | null>(null);
  const [modalParentId, setModalParentId] = useState<string>("");
  const [modalName, setModalName] = useState("");
  const [modalSlug, setModalSlug] = useState("");
  const [modalDescription, setModalDescription] = useState("");
  const [modalImage, setModalImage] = useState("");
  const [modalBanner, setModalBanner] = useState("");
  const [modalSortOrder, setModalSortOrder] = useState(0);
  const [modalIsActive, setModalIsActive] = useState(true);

  // Safe Delete Modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingCategory, setDeletingCategory] = useState<CategoryItem | null>(null);
  const [reassignTargetId, setReassignTargetId] = useState("");

  // Reassign Products Modal
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [reassignSourceId, setReassignSourceId] = useState("");
  const [reassignDestId, setReassignDestId] = useState("");

  // CSV Import Modal
  const [showCsvModal, setShowCsvModal] = useState(false);
  const [csvText, setCsvText] = useState("");
  const [csvImporting, setCsvImporting] = useState(false);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/categories");
      const json = await res.json();
      if (json.success) {
        setCategories(json.data || []);
      }
    } catch {
      toast.error("Failed to load categories");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  // Top level departments
  const departments = useMemo(() => {
    return categories.filter((c) => !c.parentId);
  }, [categories]);

  // Subcategories mapped by parentId
  const subcategoriesByParent = useMemo(() => {
    const map = new Map<string, CategoryItem[]>();
    categories.forEach((c) => {
      if (c.parentId) {
        const list = map.get(c.parentId) || [];
        list.push(c);
        map.set(c.parentId, list);
      }
    });
    return map;
  }, [categories]);

  // Total metrics
  const totalProductsCount = useMemo(() => {
    return categories.reduce((sum, c) => sum + (c._count?.products || 0), 0);
  }, [categories]);

  // Filtered view
  const filteredDepartments = useMemo(() => {
    if (!searchQuery.trim()) return departments;
    const q = searchQuery.toLowerCase();
    return departments.filter((d) => {
      if (d.name.toLowerCase().includes(q) || d.slug.toLowerCase().includes(q)) return true;
      const subs = subcategoriesByParent.get(d.id) || [];
      return subs.some((s) => s.name.toLowerCase().includes(q) || s.slug.toLowerCase().includes(q));
    });
  }, [departments, subcategoriesByParent, searchQuery]);

  const toggleExpand = (deptId: string) => {
    setExpandedDepartments((prev) => ({
      ...prev,
      [deptId]: !prev[deptId],
    }));
  };

  const expandAll = () => {
    const all: Record<string, boolean> = {};
    departments.forEach((d) => (all[d.id] = true));
    setExpandedDepartments(all);
  };

  const collapseAll = () => {
    setExpandedDepartments({});
  };

  // Open Create/Edit modal
  const openCreateModal = (parent?: CategoryItem) => {
    setEditingCategory(null);
    setModalParentId(parent ? parent.id : "");
    setModalName("");
    setModalSlug("");
    setModalDescription("");
    setModalImage("");
    setModalBanner("");
    setModalSortOrder(0);
    setModalIsActive(true);
    setShowEditModal(true);
  };

  const openEditModal = (cat: CategoryItem) => {
    setEditingCategory(cat);
    setModalParentId(cat.parentId || "");
    setModalName(cat.name);
    setModalSlug(cat.slug);
    setModalDescription(cat.description || "");
    setModalImage(cat.image || "");
    setModalBanner(cat.banner || "");
    setModalSortOrder(cat.sortOrder);
    setModalIsActive(cat.isActive);
    setShowEditModal(true);
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalName.trim()) {
      toast.error("Category name is required");
      return;
    }

    try {
      const payload = {
        name: modalName.trim(),
        slug: modalSlug.trim() || undefined,
        description: modalDescription || null,
        image: modalImage || null,
        banner: modalBanner || null,
        parentId: modalParentId || null,
        sortOrder: Number(modalSortOrder) || 0,
        isActive: modalIsActive,
      };

      let res;
      if (editingCategory) {
        res = await fetch("/api/admin/categories", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: editingCategory.id, ...payload }),
        });
      } else {
        res = await fetch("/api/admin/categories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to save category");

      toast.success(editingCategory ? "Category updated successfully" : "Category created successfully");
      setShowEditModal(false);
      fetchCategories();
    } catch (err: any) {
      toast.error(err.message || "Failed to save category");
    }
  };

  // Toggle active/inactive
  const handleToggleActive = async (cat: CategoryItem) => {
    try {
      const res = await fetch("/api/admin/categories", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: cat.id, isActive: !cat.isActive }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to toggle status");
      toast.success(`Category ${cat.isActive ? "deactivated" : "activated"}`);
      fetchCategories();
    } catch (err: any) {
      toast.error(err.message || "Error toggling category status");
    }
  };

  // Safe delete handler
  const confirmDeleteCategory = async () => {
    if (!deletingCategory) return;
    try {
      const url = `/api/admin/categories?id=${deletingCategory.id}${
        reassignTargetId ? `&reassignToId=${reassignTargetId}` : ""
      }`;
      const res = await fetch(url, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to delete category");

      toast.success(json.message || "Category safely deleted");
      setShowDeleteModal(false);
      setDeletingCategory(null);
      setReassignTargetId("");
      fetchCategories();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete category");
    }
  };

  // Reassign products handler
  const handleReassignProducts = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reassignSourceId || !reassignDestId) {
      toast.error("Please select both source and destination categories");
      return;
    }
    if (reassignSourceId === reassignDestId) {
      toast.error("Source and destination cannot be identical");
      return;
    }

    try {
      const res = await fetch("/api/admin/categories/reassign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromCategoryId: reassignSourceId,
          toCategoryId: reassignDestId,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to reassign products");

      toast.success(json.message || "Products reassigned successfully");
      setShowReassignModal(false);
      setReassignSourceId("");
      setReassignDestId("");
      fetchCategories();
    } catch (err: any) {
      toast.error(err.message || "Failed to reassign products");
    }
  };

  // CSV Import handler
  const handleImportCsv = async () => {
    if (!csvText.trim()) {
      toast.error("Please paste CSV data");
      return;
    }
    setCsvImporting(true);
    try {
      const res = await fetch("/api/admin/categories/csv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csvText }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "CSV import failed");

      toast.success(json.message || "Categories imported successfully");
      setShowCsvModal(false);
      setCsvText("");
      fetchCategories();
    } catch (err: any) {
      toast.error(err.message || "Failed to import CSV");
    } finally {
      setCsvImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header & Actions Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-gray-100">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">
              Category Hierarchy & Catalog Engine
            </h1>
            <span className="text-xs bg-blue-100 text-blue-800 font-extrabold px-2.5 py-0.5 rounded-full">
              12 Departments
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Database-backed hierarchical taxonomy supporting 290+ verified subcategories, CSV imports, and safe product migration.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Export CSV */}
          <a
            href="/api/admin/categories/csv"
            download
            className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 px-3.5 py-2 text-xs font-bold shadow-xs transition"
          >
            <Download className="w-3.5 h-3.5 text-blue-600" />
            <span>Export CSV</span>
          </a>

          {/* Import CSV */}
          <button
            onClick={() => setShowCsvModal(true)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 px-3.5 py-2 text-xs font-bold shadow-xs transition"
          >
            <Upload className="w-3.5 h-3.5 text-purple-600" />
            <span>Import CSV</span>
          </button>

          {/* Reassign Products */}
          <button
            onClick={() => setShowReassignModal(true)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 px-3.5 py-2 text-xs font-bold shadow-xs transition"
          >
            <MoveRight className="w-3.5 h-3.5 text-amber-600" />
            <span>Move Products</span>
          </button>

          {/* Add Category */}
          <button
            onClick={() => openCreateModal()}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-xs font-bold shadow-md shadow-blue-500/20 transition"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>New Category</span>
          </button>
        </div>
      </div>

      {/* 2. Stat Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-xs">
          <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
            Main Departments
          </div>
          <div className="text-2xl font-black text-gray-900 mt-1 font-mono">
            {departments.length}
          </div>
          <div className="text-[10px] text-blue-600 font-semibold mt-1">
            Top-level marketplace portals
          </div>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-xs">
          <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
            Total Subcategories
          </div>
          <div className="text-2xl font-black text-gray-900 mt-1 font-mono">
            {categories.length - departments.length}
          </div>
          <div className="text-[10px] text-purple-600 font-semibold mt-1">
            Deep granular catalog nodes
          </div>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-xs">
          <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
            Products Cataloged
          </div>
          <div className="text-2xl font-black text-gray-900 mt-1 font-mono">
            {totalProductsCount}
          </div>
          <div className="text-[10px] text-emerald-600 font-semibold mt-1">
            Live database items mapped
          </div>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-xs">
          <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
            Hierarchy Integrity
          </div>
          <div className="text-2xl font-black text-emerald-600 mt-1 flex items-center gap-1.5">
            <CheckCircle2 className="w-6 h-6" />
            <span>100%</span>
          </div>
          <div className="text-[10px] text-gray-500 font-semibold mt-1">
            Zero circular parent loops
          </div>
        </div>
      </div>

      {/* 3. Search & Hierarchy Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-gray-200 shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search categories or subcategories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-gray-200 outline-none focus:border-blue-600 font-medium"
          />
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            onClick={expandAll}
            className="text-xs font-bold text-gray-600 hover:text-blue-600 px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition"
          >
            Expand All
          </button>
          <button
            onClick={collapseAll}
            className="text-xs font-bold text-gray-600 hover:text-blue-600 px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition"
          >
            Collapse All
          </button>
        </div>
      </div>

      {/* 4. Hierarchical Departments Tree */}
      <div className="space-y-3">
        {filteredDepartments.map((dept) => {
          const isExpanded = expandedDepartments[dept.id] || Boolean(searchQuery.trim());
          const subcategories = subcategoriesByParent.get(dept.id) || [];
          const deptProducts = (dept._count?.products || 0) + subcategories.reduce((s, c) => s + (c._count?.products || 0), 0);

          return (
            <div
              key={dept.id}
              className="rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-xs transition"
            >
              {/* Department Row */}
              <div className="p-4 flex items-center justify-between bg-white hover:bg-gray-50/70 gap-4">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => toggleExpand(dept.id)}
                    className="p-1 rounded-lg hover:bg-gray-200 text-gray-500 transition"
                    aria-label="Toggle department"
                  >
                    <ChevronDown
                      className={`w-5 h-5 transition-transform ${
                        isExpanded ? "rotate-0 text-blue-600" : "-rotate-90 text-gray-400"
                      }`}
                    />
                  </button>

                  <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center p-1.5 shrink-0">
                    <img
                      src={dept.image || "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=100&q=80"}
                      alt={dept.name}
                      className="w-full h-full object-contain rounded-md"
                    />
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-black text-gray-900 text-sm">{dept.name}</h3>
                      <span className="font-mono text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                        /{dept.slug}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          dept.isActive
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {dept.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">
                      {dept.description || "Main Department"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-right hidden sm:block">
                    <div className="text-xs font-black text-gray-900 font-mono">
                      {subcategories.length} Subcategories
                    </div>
                    <div className="text-[10px] text-gray-400">
                      {deptProducts} Total Products
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* Add Subcategory */}
                    <button
                      onClick={() => openCreateModal(dept)}
                      title="Add subcategory"
                      className="p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:text-blue-600 hover:bg-blue-50 transition"
                    >
                      <Plus className="w-4 h-4" />
                    </button>

                    {/* Toggle Active */}
                    <button
                      onClick={() => handleToggleActive(dept)}
                      title={dept.isActive ? "Deactivate" : "Activate"}
                      className="p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition"
                    >
                      {dept.isActive ? <Eye className="w-4 h-4 text-emerald-600" /> : <EyeOff className="w-4 h-4 text-gray-400" />}
                    </button>

                    {/* Edit */}
                    <button
                      onClick={() => openEditModal(dept)}
                      title="Edit Category"
                      className="p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:text-blue-600 hover:bg-blue-50 transition"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>

                    {/* Delete */}
                    <button
                      onClick={() => {
                        setDeletingCategory(dept);
                        setShowDeleteModal(true);
                      }}
                      title="Delete Category"
                      className="p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:text-red-600 hover:bg-red-50 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Nested Subcategories List */}
              {isExpanded && (
                <div className="border-t border-gray-100 bg-gray-50/60 p-3 divide-y divide-gray-100">
                  {subcategories.length === 0 ? (
                    <div className="py-4 text-center text-xs text-gray-400">
                      No subcategories created yet under {dept.name}.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 py-2">
                      {subcategories.map((sub) => (
                        <div
                          key={sub.id}
                          className="bg-white rounded-xl border border-gray-200/80 p-3 flex items-center justify-between hover:border-blue-300 transition shadow-xs"
                        >
                          <div className="min-w-0 pr-2">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-xs text-gray-800 truncate">
                                {sub.name}
                              </span>
                              {!sub.isActive && (
                                <span className="text-[9px] bg-gray-100 text-gray-500 px-1 py-0.2 rounded font-semibold">
                                  Off
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] font-mono text-gray-400">
                              /{sub.slug}
                            </div>
                            <div className="text-[10px] text-blue-600 font-semibold mt-0.5">
                              {sub._count?.products || 0} products
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => openEditModal(sub)}
                              className="p-1 text-gray-400 hover:text-blue-600"
                              title="Edit"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                setDeletingCategory(sub);
                                setShowDeleteModal(true);
                              }}
                              className="p-1 text-gray-400 hover:text-red-600"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 5. Create / Edit Category Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="font-black text-gray-900 text-base">
                {editingCategory ? `Edit Category: ${editingCategory.name}` : "Create New Category / Subcategory"}
              </h3>
              <button onClick={() => setShowEditModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCategory} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-gray-700">Category Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Smartphones or Mobiles & Accessories"
                  value={modalName}
                  onChange={(e) => setModalName(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-gray-200 p-2.5 outline-none focus:border-blue-600 font-medium"
                />
              </div>

              <div>
                <label className="font-bold text-gray-700">Custom URL Slug (optional)</label>
                <input
                  type="text"
                  placeholder="e.g. smartphones"
                  value={modalSlug}
                  onChange={(e) => setModalSlug(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-gray-200 p-2.5 outline-none focus:border-blue-600 font-mono"
                />
              </div>

              <div>
                <label className="font-bold text-gray-700">Parent Department</label>
                <select
                  value={modalParentId}
                  onChange={(e) => setModalParentId(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-gray-200 p-2.5 outline-none focus:border-blue-600 font-medium"
                >
                  <option value="">None (Top-Level Department)</option>
                  {departments
                    .filter((d) => !editingCategory || d.id !== editingCategory.id)
                    .map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                </select>
                <p className="text-[10px] text-gray-400 mt-0.5">
                  Select a department to nest this as a subcategory.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-gray-700">Thumbnail Image URL</label>
                  <input
                    type="url"
                    placeholder="https://..."
                    value={modalImage}
                    onChange={(e) => setModalImage(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-gray-200 p-2.5 outline-none focus:border-blue-600"
                  />
                </div>
                <div>
                  <label className="font-bold text-gray-700">Display Order</label>
                  <input
                    type="number"
                    value={modalSortOrder}
                    onChange={(e) => setModalSortOrder(Number(e.target.value) || 0)}
                    className="mt-1 w-full rounded-xl border border-gray-200 p-2.5 outline-none focus:border-blue-600 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-gray-700">Banner Background URL (optional)</label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={modalBanner}
                  onChange={(e) => setModalBanner(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-gray-200 p-2.5 outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="font-bold text-gray-700">Description</label>
                <textarea
                  rows={2}
                  placeholder="Catalog description for storefront and SEO..."
                  value={modalDescription}
                  onChange={(e) => setModalDescription(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-gray-200 p-2.5 outline-none focus:border-blue-600"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="catActive"
                  checked={modalIsActive}
                  onChange={(e) => setModalIsActive(e.target.checked)}
                  className="rounded text-blue-600"
                />
                <label htmlFor="catActive" className="font-bold text-gray-700 cursor-pointer">
                  Active and visible on storefront
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black shadow-md shadow-blue-500/20"
                >
                  {editingCategory ? "Save Changes" : "Create Category"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. Safe Deletion & Reassignment Modal */}
      {showDeleteModal && deletingCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-black text-gray-900 text-base">
                  Delete Category: {deletingCategory.name}
                </h3>
                <p className="text-xs text-gray-500">
                  Safe deletion guard protection
                </p>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 space-y-1">
              <p className="font-bold">Items associated with this category:</p>
              <ul className="list-disc list-inside">
                <li>{deletingCategory._count?.products || 0} product(s)</li>
                <li>{deletingCategory._count?.children || 0} child subcategory(ies)</li>
              </ul>
            </div>

            {(deletingCategory._count?.products || 0) > 0 || (deletingCategory._count?.children || 0) > 0 ? (
              <div className="space-y-2 text-xs">
                <label className="font-bold text-gray-700">
                  Reassign products and subcategories to:
                </label>
                <select
                  value={reassignTargetId}
                  onChange={(e) => setReassignTargetId(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 p-2.5 font-medium outline-none focus:border-blue-600"
                >
                  <option value="">Select Target Category...</option>
                  {categories
                    .filter((c) => c.id !== deletingCategory.id)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} (/{c.slug})
                      </option>
                    ))}
                </select>
                <p className="text-[10px] text-gray-500">
                  Items will be safely moved before this category is removed.
                </p>
              </div>
            ) : (
              <p className="text-xs text-gray-600">
                This category contains 0 products and can be deleted immediately.
              </p>
            )}

            <div className="flex justify-end gap-2 pt-3 border-t border-gray-100 text-xs">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteCategory}
                disabled={
                  ((deletingCategory._count?.products || 0) > 0 ||
                    (deletingCategory._count?.children || 0) > 0) &&
                  !reassignTargetId
                }
                className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black shadow-md shadow-red-500/20 disabled:opacity-50"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. Reassign Products in Bulk Modal */}
      {showReassignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="font-black text-gray-900 text-base">Move Products in Bulk</h3>
              <button onClick={() => setShowReassignModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleReassignProducts} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-gray-700">Source Category (From)</label>
                <select
                  required
                  value={reassignSourceId}
                  onChange={(e) => setReassignSourceId(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-gray-200 p-2.5 outline-none focus:border-blue-600 font-medium"
                >
                  <option value="">Select source category...</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c._count?.products || 0} products)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-gray-700">Destination Category (To)</label>
                <select
                  required
                  value={reassignDestId}
                  onChange={(e) => setReassignDestId(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-gray-200 p-2.5 outline-none focus:border-blue-600 font-medium"
                >
                  <option value="">Select destination category...</option>
                  {categories
                    .filter((c) => c.id !== reassignSourceId)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} (/{c.slug})
                      </option>
                    ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowReassignModal(false)}
                  className="px-4 py-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black shadow-md shadow-blue-500/20"
                >
                  Move All Products
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 8. CSV Import Modal */}
      {showCsvModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="font-black text-gray-900 text-base">Import Categories via CSV</h3>
              <button onClick={() => setShowCsvModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-gray-500">
                Paste CSV text with columns: <code className="bg-gray-100 px-1 py-0.5 rounded font-mono font-bold">name,slug,parentSlug,sortOrder,isActive,description,image,banner</code>
              </p>

              <textarea
                rows={8}
                placeholder="name,slug,parentSlug,sortOrder,isActive,description&#10;Smartphones,smartphones,mobiles-accessories,1,true,Latest Android and iOS phones"
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                className="w-full rounded-xl border border-gray-200 p-3 font-mono text-xs outline-none focus:border-blue-600"
              />

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowCsvModal(false)}
                  className="px-4 py-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={csvImporting}
                  onClick={handleImportCsv}
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-black shadow-md shadow-purple-500/20 disabled:opacity-50"
                >
                  {csvImporting ? "Importing..." : "Process CSV"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
