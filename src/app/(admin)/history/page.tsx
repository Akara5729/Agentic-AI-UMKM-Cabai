"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Order, OrderStatus } from "@/types/database";
import { formatRupiah } from "@/lib/utils";
import {
  History,
  Download,
  Filter,
  Search,
  DollarSign,
  ShoppingBag,
  Weight,
  CheckCircle,
  XCircle,
  Calendar,
} from "lucide-react";

export default function HistoryPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      let query = supabase
        .from("orders")
        .select(`
          *,
          items:order_items(*)
        `)
        .order("created_at", { ascending: false });

      if (statusFilter !== "ALL") {
        query = query.eq("status", statusFilter);
      }

      const { data, error } = await query;
      if (!error && data) {
        setOrders(data as unknown as Order[]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Hitung metrik analitik
  const completedOrders = orders.filter((o) => o.status === "COMPLETED");
  const totalRevenue = completedOrders.reduce(
    (sum, o) => sum + Number(o.total_amount),
    0
  );

  const totalKgSold = completedOrders.reduce((sum, o) => {
    const itemTotal = (o.items || []).reduce(
      (iSum, it) => iSum + Number(it.quantity_kg),
      0
    );
    return sum + itemTotal;
  }, 0);

  // Filter pencarian nama atau nomor pesanan
  const filteredOrders = orders.filter((o) => {
    const matchName = o.customer_name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchNumber = o.order_number
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    return matchName || matchNumber;
  });

  // Fungsi ekspor CSV
  const exportToCSV = () => {
    if (orders.length === 0) {
      alert("Tidak ada data untuk diekspor.");
      return;
    }

    const headers = [
      "Nomor Pesanan",
      "Waktu Transaksi",
      "Nama Pelanggan",
      "Status",
      "Total Nominal (Rp)",
      "Metode",
      "Detail Item",
      "Catatan",
    ];

    const rows = orders.map((o) => {
      const itemsStr = (o.items || [])
        .map(
          (it) =>
            `${it.product_name_snapshot} (${it.quantity_kg}kg${
              it.stem_removed ? " dipetik" : ""
            })`
        )
        .join("; ");

      return [
        `"${o.order_number}"`,
        `"${new Date(o.created_at).toLocaleString("id-ID")}"`,
        `"${o.customer_name}"`,
        `"${o.status}"`,
        o.total_amount,
        `"${o.fulfillment_method}"`,
        `"${itemsStr}"`,
        `"${o.notes || ""}"`,
      ].join(",");
    });

    const csvContent =
      "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(","), ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `Laporan_Penjualan_Cabai_${new Date().toISOString().split("T")[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <History className="w-6 h-6 text-red-600" />
            <span>Riwayat Transaksi & Rekap Penjualan</span>
          </h1>
          <p className="text-sm text-slate-500">
            Daftar seluruh transaksi yang masuk dari bot Telegram beserta laporan omzet.
          </p>
        </div>

        <button
          onClick={exportToCSV}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-black text-white shadow-sm transition-all"
        >
          <Download className="w-4 h-4" />
          <span>Ekspor CSV (Excel)</span>
        </button>
      </div>

      {/* Cards Metrik Analitik */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Omzet Selesai
            </p>
            <h3 className="text-xl font-extrabold text-slate-900">
              {formatRupiah(totalRevenue)}
            </h3>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
            <ShoppingBag className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Pesanan Selesai
            </p>
            <h3 className="text-xl font-extrabold text-slate-900">
              {completedOrders.length} transaksi
            </h3>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center text-red-600 shrink-0">
            <Weight className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Volume Cabai Terjual
            </p>
            <h3 className="text-xl font-extrabold text-slate-900">
              {totalKgSold.toFixed(1)} kg
            </h3>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200/80 shadow-sm">
        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari nama atau no tiket..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500"
          />
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto">
          {[
            { id: "ALL", label: "Semua" },
            { id: "PENDING", label: "Pending" },
            { id: "CONFIRMED", label: "Dikonfirmasi" },
            { id: "PREPARING", label: "Dipetik" },
            { id: "READY", label: "Siap" },
            { id: "COMPLETED", label: "Selesai" },
            { id: "CANCELLED", label: "Batal" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                statusFilter === tab.id
                  ? "bg-slate-900 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tabel Riwayat */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 text-xs font-bold uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-4">No. Antrean</th>
                <th className="py-3.5 px-4">Tanggal / Waktu</th>
                <th className="py-3.5 px-4">Nama Pelanggan</th>
                <th className="py-3.5 px-4">Item Cabai</th>
                <th className="py-3.5 px-4">Total</th>
                <th className="py-3.5 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 text-xs">
                    Memuat riwayat transaksi...
                  </td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 text-xs">
                    Tidak ada transaksi ditemukan.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => (
                  <tr
                    key={order.id}
                    className="hover:bg-slate-50/60 transition-colors"
                  >
                    <td className="py-3 px-4 font-mono font-bold text-xs text-red-600">
                      #{order.order_number}
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-500 whitespace-nowrap">
                      {new Date(order.created_at).toLocaleString("id-ID", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      {order.customer_name}
                      {order.customer_username && (
                        <span className="text-slate-400 text-xs ml-1 font-normal">
                          (@{order.customer_username})
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-600 max-w-xs">
                      {(order.items || []).map((it) => (
                        <div key={it.id}>
                          • {it.product_name_snapshot} ({it.quantity_kg}kg
                          {it.stem_removed && ", dipetik"})
                        </div>
                      ))}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900 whitespace-nowrap">
                      {formatRupiah(order.total_amount)}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                          order.status === "COMPLETED"
                            ? "bg-emerald-100 text-emerald-800"
                            : order.status === "READY"
                            ? "bg-blue-100 text-blue-800"
                            : order.status === "CANCELLED"
                            ? "bg-slate-100 text-slate-600"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {order.status}
                      </span>
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
