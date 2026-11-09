/**
 * API Route: Update Status Pesanan
 *
 * Digunakan oleh Dashboard Admin untuk mengubah status pesanan
 * dan secara otomatis mengirimkan notifikasi ke pelanggan via Telegram.
 *
 * PATCH /api/orders/status
 * Body: { orderId: string, newStatus: OrderStatus }
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { sendMessage, formatStatusUpdateMessage } from "@/lib/telegram/client";
import { OrderStatus } from "@/types/database";

export async function PATCH(req: NextRequest): Promise<NextResponse> {
  try {
    const { orderId, newStatus } = (await req.json()) as {
      orderId: string;
      newStatus: OrderStatus;
    };

    if (!orderId || !newStatus) {
      return NextResponse.json(
        { error: "orderId dan newStatus wajib diisi" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Ambil data pesanan yang ada
    const { data: order, error: fetchErr } = await supabase
      .from("orders")
      .select("id, telegram_chat_id, order_number, status, customer_name")
      .eq("id", orderId)
      .single();

    if (fetchErr || !order) {
      return NextResponse.json(
        { error: "Pesanan tidak ditemukan" },
        { status: 404 }
      );
    }

    // Update status pesanan
    const { error: updateErr } = await supabase
      .from("orders")
      .update({
        status: newStatus,
        updated_at: new Date().toISOString(),
      } as Record<string, unknown>)
      .eq("id", orderId);

    if (updateErr) {
      return NextResponse.json(
        { error: "Gagal mengupdate status pesanan" },
        { status: 500 }
      );
    }

    // Kirim notifikasi Telegram ke pelanggan (non-blocking)
    const { data: storeData } = await supabase
      .from("store_settings")
      .select("store_name")
      .limit(1)
      .single();

    const storeName = storeData?.store_name || "UMKM Cabai Berkah";
    const notifMessage = formatStatusUpdateMessage(
      (order as Record<string, unknown>).order_number as string,
      newStatus,
      storeName
    );

    // Kirim notifikasi secara async (tidak blokir respons API)
    sendMessage(Number((order as Record<string, unknown>).telegram_chat_id), notifMessage).catch((err) =>
      console.error("[STATUS API] Failed to send Telegram notification:", err)
    );

    return NextResponse.json({
      success: true,
      message: `Status pesanan diubah menjadi ${newStatus} dan notifikasi Telegram dikirim`,
      order: {
        id: orderId,
        order_number: (order as Record<string, unknown>).order_number,
        newStatus,
      },
    });
  } catch (error) {
    console.error("[STATUS API] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
