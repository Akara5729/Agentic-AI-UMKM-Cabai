"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { StoreSettings } from "@/types/database";
import {
  Store,
  Power,
  Clock,
  MapPin,
  CreditCard,
  Scissors,
  Save,
  Check,
  RotateCcw,
  AlertTriangle,
} from "lucide-react";

export default function SettingsPage() {
  const [settings, setSettings] = useState<StoreSettings>({
    id: "",
    store_name: "Toko Cabai Ibu Umi",
    is_open: true,
    opening_hours: "07:00 - 17:00 WIB",
    address: "Jl. Pasar Bitingan Bawah",
    payment_info: "BCA: 1234567890 a.n Toko Cabai Ibu Umi / QRIS tersedia di kios",
    stem_removal_fee_per_kg: 2000,
    min_order_kg: 0.5,
    updated_at: "",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("store_settings")
        .select("*")
        .limit(1)
        .single();

      if (!error && data) {
        setSettings(data as StoreSettings);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveSuccess(false);

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("store_settings")
        .upsert({
          ...settings,
          updated_at: new Date().toISOString(),
        } as Record<string, unknown>);

      if (!error) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        alert("Gagal menyimpan: " + error.message);
      }
    } catch (err) {
      console.error(err);
      alert("Terjadi kesalahan.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="pb-4 border-b border-slate-200">
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
          <Store className="w-6 h-6 text-red-600" />
          <span>Pengaturan Toko & Tombol Darurat</span>
        </h1>
        <p className="text-sm text-slate-500">
          Kelola status operasional toko, alamat, dan tarif kustomisasi petik tangkai.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Card 1: Tombol Darurat Buka / Tutup Toko */}
        <div
          className={`p-6 rounded-2xl border transition-all ${
            settings.is_open
              ? "bg-emerald-50/60 border-emerald-200"
              : "bg-red-50/70 border-red-200"
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Power
                  className={`w-5 h-5 ${
                    settings.is_open ? "text-emerald-600" : "text-red-600"
                  }`}
                />
                <h3 className="font-bold text-base text-slate-900">
                  Status Operasional:{" "}
                  <span
                    className={
                      settings.is_open ? "text-emerald-700" : "text-red-700"
                    }
                  >
                    {settings.is_open ? "TOKO BUKA" : "TOKO TUTUP (JEDA)"}
                  </span>
                </h3>
              </div>
              <p className="text-xs text-slate-600 max-w-xl">
                Jika toko ditutup darurat (misal hujan lebat atau kehabisan stok), bot Telegram akan langsung memberi tahu pelanggan bahwa pemesanan sedang dijeda.
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                setSettings({ ...settings, is_open: !settings.is_open })
              }
              className={`px-5 py-2.5 rounded-xl font-bold text-xs shadow-sm transition-all flex items-center gap-2 shrink-0 ${
                settings.is_open
                  ? "bg-red-600 hover:bg-red-700 text-white"
                  : "bg-emerald-600 hover:bg-emerald-700 text-white"
              }`}
            >
              <Power className="w-4 h-4" />
              <span>{settings.is_open ? "Tutup Toko Sementara" : "Buka Toko Sekarang"}</span>
            </button>
          </div>
        </div>

        {/* Card 2: Form Pengaturan Lengkap */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Nama Toko */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nama Usaha UMKM
              </label>
              <input
                type="text"
                required
                value={settings.store_name}
                onChange={(e) =>
                  setSettings({ ...settings, store_name: e.target.value })
                }
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-red-500 font-medium"
              />
            </div>

            {/* Jam Operasional */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                <span>Jam Buka / Layanan</span>
              </label>
              <input
                type="text"
                required
                value={settings.opening_hours}
                onChange={(e) =>
                  setSettings({ ...settings, opening_hours: e.target.value })
                }
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>

            {/* Biaya Jasa Petik Tangkai */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                <Scissors className="w-3.5 h-3.5 text-slate-500" />
                <span>Biaya Jasa Petik Tangkai per Kg (Rp)</span>
              </label>
              <input
                type="number"
                step="500"
                min="0"
                required
                value={settings.stem_removal_fee_per_kg}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    stem_removal_fee_per_kg: Number(e.target.value),
                  })
                }
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-red-500 font-semibold"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Isi 0 jika layanan petik tangkai digratiskan.
              </p>
            </div>

            {/* Minimum Order */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Minimum Pembelian (Kg)
              </label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                required
                value={settings.min_order_kg}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    min_order_kg: Number(e.target.value),
                  })
                }
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-red-500 font-semibold"
              />
            </div>
          </div>

          {/* Alamat Kios */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-slate-500" />
              <span>Alamat Kios Pengambilan</span>
            </label>
            <textarea
              rows={2}
              required
              value={settings.address}
              onChange={(e) =>
                setSettings({ ...settings, address: e.target.value })
              }
              className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>

          {/* Cara Bayar */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5 text-slate-500" />
              <span>Instruksi Pembayaran (Rekening / QRIS / Tunai)</span>
            </label>
            <input
              type="text"
              required
              value={settings.payment_info}
              onChange={(e) =>
                setSettings({ ...settings, payment_info: e.target.value })
              }
              className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>

          {/* Submit Button */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold bg-slate-900 hover:bg-black text-white shadow-md transition-all disabled:opacity-50"
            >
              {saving ? (
                <RotateCcw className="w-4 h-4 animate-spin" />
              ) : saveSuccess ? (
                <Check className="w-4 h-4 text-emerald-400" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>
                {saving
                  ? "Menyimpan..."
                  : saveSuccess
                  ? "Tersimpan!"
                  : "Simpan Pengaturan"}
              </span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
