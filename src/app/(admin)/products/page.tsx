"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Product } from "@/types/database";
import { formatRupiah } from "@/lib/utils";
import {
  Save,
  RotateCcw,
  Plus,
  Check,
  AlertCircle,
  TrendingUp,
  PackageCheck,
  Flame,
} from "lucide-react";

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form tambah produk baru (modal / collapsible)
  const [showAddForm, setShowAddForm] = useState(false);
  const [newProduct, setNewProduct] = useState({
    name: "",
    slug: "",
    current_price_per_kg: 35000,
    stock_kg: 20,
    is_available: true,
  });

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("name");

      if (error) {
        setErrorMessage(error.message);
      } else if (data) {
        setProducts(data as Product[]);
      }
    } catch (err) {
      console.error(err);
      setErrorMessage("Gagal memuat produk dari database.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Handle perubahan nilai input lokal pada tabel
  const handleInputChange = (
    id: string,
    field: keyof Product,
    value: string | number | boolean
  ) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, [field]: value } : p))
    );
  };

  // Simpan semua perubahan harga dan stok ke database
  const handleSaveAll = async () => {
    setSaving(true);
    setSaveSuccess(false);
    setErrorMessage(null);

    try {
      const supabase = createClient();

      const updatePromises = products.map((p) =>
        supabase
          .from("products")
          .update({
            current_price_per_kg: Number(p.current_price_per_kg),
            stock_kg: Number(p.stock_kg),
            is_available: Boolean(p.is_available),
            updated_at: new Date().toISOString(),
          } as Record<string, unknown>)
          .eq("id", p.id)
      );

      await Promise.all(updatePromises);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error(err);
      setErrorMessage("Gagal menyimpan perubahan ke database.");
    } finally {
      setSaving(false);
    }
  };

  // Tambah varian produk baru
  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProduct.name) return;

    try {
      const supabase = createClient();
      const slug =
        newProduct.slug ||
        newProduct.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "");

      const { error } = await supabase.from("products").insert({
        name: newProduct.name,
        slug,
        current_price_per_kg: Number(newProduct.current_price_per_kg),
        stock_kg: Number(newProduct.stock_kg),
        is_available: true,
      } as Record<string, unknown>);

      if (!error) {
        setShowAddForm(false);
        setNewProduct({
          name: "",
          slug: "",
          current_price_per_kg: 35000,
          stock_kg: 20,
          is_available: true,
        });
        fetchProducts();
      } else {
        alert("Gagal menambah produk: " + error.message);
      }
    } catch (err) {
      console.error(err);
      alert("Terjadi kesalahan.");
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Flame className="w-6 h-6 text-red-600" />
            <span>Katalog & Quick Daily Price Editor</span>
          </h1>
          <p className="text-sm text-slate-500">
            Perbarui harga dan kuota stok cabai harian di sini. Bot Telegram akan langsung membaca harga terbaru secara real-time.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm transition-all"
          >
            <Plus className="w-3.5 h-3.5 text-red-600" />
            <span>Tambah Varian</span>
          </button>

          <button
            disabled={saving}
            onClick={handleSaveAll}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-red-600 hover:bg-red-700 text-white shadow-md shadow-red-600/20 transition-all disabled:opacity-50"
          >
            {saving ? (
              <RotateCcw className="w-3.5 h-3.5 animate-spin" />
            ) : saveSuccess ? (
              <Check className="w-3.5 h-3.5" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            <span>
              {saving
                ? "Menyimpan..."
                : saveSuccess
                ? "Tersimpan!"
                : "Simpan Semua Perubahan"}
            </span>
          </button>
        </div>
      </div>

      {/* Alert Error / Success */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
          <span>
            {errorMessage}. Jika Anda belum menjalankan SQL di Supabase, silakan eksekusi file <code>supabase/schema.sql</code> terlebih dahulu.
          </span>
        </div>
      )}

      {/* Modal / Form Tambah Produk */}
      {showAddForm && (
        <form
          onSubmit={handleCreateProduct}
          className="p-5 rounded-2xl bg-white border border-red-200 shadow-sm space-y-4"
        >
          <h3 className="font-bold text-sm text-slate-900">
            Tambah Varian Cabai Baru
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Nama Varian Cabai
              </label>
              <input
                type="text"
                required
                placeholder="misal: Cabai Rawit Putih"
                value={newProduct.name}
                onChange={(e) =>
                  setNewProduct({ ...newProduct, name: e.target.value })
                }
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Harga per Kg (Rp)
              </label>
              <input
                type="number"
                required
                value={newProduct.current_price_per_kg}
                onChange={(e) =>
                  setNewProduct({
                    ...newProduct,
                    current_price_per_kg: Number(e.target.value),
                  })
                }
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Stok Hari Ini (Kg)
              </label>
              <input
                type="number"
                step="0.5"
                required
                value={newProduct.stock_kg}
                onChange={(e) =>
                  setNewProduct({
                    ...newProduct,
                    stock_kg: Number(e.target.value),
                  })
                }
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-100"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-red-600 text-white hover:bg-red-700"
            >
              Simpan Produk
            </button>
          </div>
        </form>
      )}

      {/* Tabel Bulk Editor */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 text-xs font-bold uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Nama Produk Cabai</th>
                <th className="py-3.5 px-4">Harga / Kg (Rp)</th>
                <th className="py-3.5 px-4">Stok (Kg)</th>
                <th className="py-3.5 px-4">Ketersediaan</th>
                <th className="py-3.5 px-4 text-right">Preview Format</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    Memuat katalog...
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    Belum ada data cabai. Silakan tambah varian atau jalankan schema.sql.
                  </td>
                </tr>
              ) : (
                products.map((product) => (
                  <tr
                    key={product.id}
                    className="hover:bg-slate-50/60 transition-colors"
                  >
                    {/* Nama Cabai */}
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      {product.name}
                    </td>

                    {/* Input Harga / Kg */}
                    <td className="py-3 px-4">
                      <div className="relative rounded-lg shadow-sm w-40">
                        <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400 text-xs">
                          Rp
                        </span>
                        <input
                          type="number"
                          step="500"
                          value={product.current_price_per_kg}
                          onChange={(e) =>
                            handleInputChange(
                              product.id,
                              "current_price_per_kg",
                              Number(e.target.value)
                            )
                          }
                          className="w-full pl-8 pr-2.5 py-1.5 text-sm font-semibold rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                        />
                      </div>
                    </td>

                    {/* Input Stok (Kg) */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5 w-32">
                        <input
                          type="number"
                          step="0.5"
                          value={product.stock_kg}
                          onChange={(e) =>
                            handleInputChange(
                              product.id,
                              "stock_kg",
                              Number(e.target.value)
                            )
                          }
                          className="w-full px-2.5 py-1.5 text-sm font-semibold rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                        />
                        <span className="text-xs text-slate-500">kg</span>
                      </div>
                    </td>

                    {/* Toggle Ketersediaan */}
                    <td className="py-3 px-4">
                      <button
                        type="button"
                        onClick={() =>
                          handleInputChange(
                            product.id,
                            "is_available",
                            !product.is_available
                          )
                        }
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                          product.is_available && product.stock_kg > 0
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-red-50 text-red-700 border border-red-200"
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            product.is_available && product.stock_kg > 0
                              ? "bg-emerald-500"
                              : "bg-red-500"
                          }`}
                        />
                        <span>
                          {product.is_available && product.stock_kg > 0
                            ? "Tersedia"
                            : "Habis"}
                        </span>
                      </button>
                    </td>

                    {/* Preview Teks Bot */}
                    <td className="py-3 px-4 text-right font-mono text-xs text-slate-600">
                      {formatRupiah(product.current_price_per_kg)} / kg
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
