"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Order, OrderStatus } from "@/types/database";
import { formatRupiah } from "@/lib/utils";
import { playOrderChime } from "@/lib/audio";
import {
  Bell,
  CheckCircle2,
  Clock,
  Package,
  RotateCcw,
  Sparkles,
  User,
  Volume2,
  XCircle,
} from "lucide-react";

const COLUMNS: Array<{
  status: OrderStatus;
  title: string;
  badgeBg: string;
  badgeText: string;
  borderColor: string;
}> = [
  {
    status: "PENDING",
    title: "Pesanan Baru Masuk",
    badgeBg: "bg-amber-100",
    badgeText: "text-amber-800",
    borderColor: "border-amber-300",
  },
  {
    status: "CONFIRMED",
    title: "Dikonfirmasi",
    badgeBg: "bg-blue-100",
    badgeText: "text-blue-800",
    borderColor: "border-blue-300",
  },
  {
    status: "PREPARING",
    title: "Ditimbang / Dipetik",
    badgeBg: "bg-purple-100",
    badgeText: "text-purple-800",
    borderColor: "border-purple-300",
  },
  {
    status: "READY",
    title: "Siap Diambil / Kirim",
    badgeBg: "bg-emerald-100",
    badgeText: "text-emerald-800",
    borderColor: "border-emerald-300",
  },
];

export default function DashboardPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Fetch initial orders
  const fetchOrders = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("orders")
        .select(`
          *,
          items:order_items(*)
        `)
        .order("created_at", { ascending: false })
        .limit(50);

      if (!error && data) {
        setOrders(data as unknown as Order[]);
      }
    } catch (err) {
      console.error("[DASHBOARD] Fetch orders error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();

    // Supabase Realtime subscription
    const supabase = createClient();
    const channel = supabase
      .channel("realtime-orders")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "orders" },
        (payload) => {
          console.log("[REALTIME] New order inserted:", payload);
          if (soundEnabled) {
            playOrderChime();
          }
          fetchOrders();
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders" },
        () => {
          fetchOrders();
        }
      )
      .subscribe();

    // Fallback polling setiap 15 detik jika WebSocket terputus
    const interval = setInterval(fetchOrders, 15000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [fetchOrders, soundEnabled]);

  // Update status pesanan via backend API
  const handleUpdateStatus = async (orderId: string, newStatus: OrderStatus) => {
    setUpdatingId(orderId);
    try {
      const res = await fetch("/api/orders/status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, newStatus }),
      });

      if (res.ok) {
        // Optimistic update
        setOrders((prev) =>
          prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
        );
      } else {
        alert("Gagal mengubah status pesanan.");
      }
    } catch (err) {
      console.error("Update status error:", err);
      alert("Terjadi kesalahan jaringan.");
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Antrean Pesanan Realtime
          </h1>
          <p className="text-sm text-slate-500">
            Pesanan dari bot Telegram otomatis masuk ke antrean dan membunyikan bel.
          </p>
        </div>

        {/* Controls Bar */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              playOrderChime();
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-all shadow-sm"
            title="Uji coba nada bel notifikasi"
          >
            <Volume2 className="w-3.5 h-3.5 text-red-600" />
            <span>Tes Bel</span>
          </button>

          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all shadow-sm ${
              soundEnabled
                ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                : "bg-slate-100 border-slate-200 text-slate-500"
            }`}
          >
            <Bell className="w-3.5 h-3.5" />
            <span>Suara: {soundEnabled ? "Aktif" : "Mati"}</span>
          </button>

          <button
            onClick={fetchOrders}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 transition-all shadow-sm"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Kanban Board Columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {COLUMNS.map((col) => {
          const colOrders = orders.filter((o) => o.status === col.status);

          return (
            <div
              key={col.status}
              className="flex flex-col bg-slate-50/80 rounded-2xl border border-slate-200/80 p-4 min-h-[500px]"
            >
              {/* Column Header */}
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${
                      col.status === "PENDING"
                        ? "bg-amber-500 animate-ping"
                        : col.status === "READY"
                        ? "bg-emerald-500"
                        : "bg-blue-500"
                    }`}
                  />
                  <h2 className="font-bold text-sm text-slate-800">
                    {col.title}
                  </h2>
                </div>
                <span
                  className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${col.badgeBg} ${col.badgeText}`}
                >
                  {colOrders.length}
                </span>
              </div>

              {/* Order Cards List */}
              <div className="flex-1 space-y-3 overflow-y-auto">
                {colOrders.length === 0 ? (
                  <div className="h-40 flex flex-col items-center justify-center text-center text-slate-400 text-xs p-4">
                    <Package className="w-8 h-8 mb-2 stroke-1 text-slate-300" />
                    <span>Tidak ada antrean</span>
                  </div>
                ) : (
                  colOrders.map((order) => (
                    <div
                      key={order.id}
                      className={`bg-white rounded-xl p-4 shadow-sm border ${col.borderColor} hover:shadow-md transition-all space-y-3`}
                    >
                      {/* Card Header: Order Number & Time */}
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="font-mono text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-100">
                            #{order.order_number}
                          </span>
                          <div className="flex items-center gap-1 text-xs text-slate-500 mt-1">
                            <Clock className="w-3 h-3" />
                            <span>
                              {new Date(order.created_at).toLocaleTimeString(
                                "id-ID",
                                { hour: "2-digit", minute: "2-digit" }
                              )}
                            </span>
                          </div>
                        </div>

                        <span className="text-xs font-bold text-slate-900">
                          {formatRupiah(order.total_amount)}
                        </span>
                      </div>

                      {/* Customer Info */}
                      <div className="flex items-center gap-1.5 text-xs font-medium text-slate-800">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span>{order.customer_name}</span>
                        {order.customer_username && (
                          <span className="text-slate-400 text-[11px]">
                            (@{order.customer_username})
                          </span>
                        )}
                      </div>

                      {/* Order Items */}
                      <div className="bg-slate-50 rounded-lg p-2.5 text-xs space-y-1.5 border border-slate-100">
                        {order.items && order.items.length > 0 ? (
                          order.items.map((it) => (
                            <div
                              key={it.id}
                              className="flex justify-between items-center text-slate-700"
                            >
                              <span>
                                {it.product_name_snapshot}{" "}
                                <strong className="text-slate-900">
                                  {it.quantity_kg} kg
                                </strong>
                                {it.stem_removed && (
                                  <span className="text-[10px] text-red-600 font-semibold ml-1">
                                    (dipetik)
                                  </span>
                                )}
                              </span>
                              <span className="text-slate-500 font-mono text-[11px]">
                                {formatRupiah(it.subtotal)}
                              </span>
                            </div>
                          ))
                        ) : (
                          <span className="text-slate-400 italic">
                            Detail item dimuat...
                          </span>
                        )}
                      </div>

                      {/* Fulfillment Method & Notes */}
                      {(order.pickup_time_estimate || order.notes) && (
                        <div className="text-[11px] text-slate-600 space-y-0.5 bg-amber-50/50 p-2 rounded border border-amber-100/60">
                          {order.pickup_time_estimate && (
                            <p>
                              ⏰ <strong>Waktu:</strong>{" "}
                              {order.pickup_time_estimate}
                            </p>
                          )}
                          {order.notes && (
                            <p>
                              📝 <strong>Catatan:</strong> {order.notes}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Action Buttons to Next State */}
                      <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
                        {order.status === "PENDING" && (
                          <button
                            disabled={updatingId === order.id}
                            onClick={() =>
                              handleUpdateStatus(order.id, "CONFIRMED")
                            }
                            className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition-all disabled:opacity-50"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Konfirmasi & Notif Bot</span>
                          </button>
                        )}

                        {order.status === "CONFIRMED" && (
                          <button
                            disabled={updatingId === order.id}
                            onClick={() =>
                              handleUpdateStatus(order.id, "PREPARING")
                            }
                            className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-sm transition-all disabled:opacity-50"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>Mulai Petik / Timbang</span>
                          </button>
                        )}

                        {order.status === "PREPARING" && (
                          <button
                            disabled={updatingId === order.id}
                            onClick={() =>
                              handleUpdateStatus(order.id, "READY")
                            }
                            className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition-all disabled:opacity-50"
                          >
                            <Bell className="w-3.5 h-3.5" />
                            <span>Pesanan Siap (Notif Bot)</span>
                          </button>
                        )}

                        {order.status === "READY" && (
                          <button
                            disabled={updatingId === order.id}
                            onClick={() =>
                              handleUpdateStatus(order.id, "COMPLETED")
                            }
                            className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-slate-900 hover:bg-black text-white text-xs font-semibold shadow-sm transition-all disabled:opacity-50"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Selesai & Lunas</span>
                          </button>
                        )}

                        {order.status !== "COMPLETED" && (
                          <button
                            disabled={updatingId === order.id}
                            onClick={() => {
                              if (confirm("Yakin ingin membatalkan pesanan ini?")) {
                                handleUpdateStatus(order.id, "CANCELLED");
                              }
                            }}
                            className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all"
                            title="Batalkan Pesanan"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
