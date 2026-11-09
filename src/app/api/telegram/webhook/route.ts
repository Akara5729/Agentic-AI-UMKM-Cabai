/**
 * Telegram Webhook Handler - Next.js Route Handler
 *
 * Menerima update dari Telegram Bot API (webhook mode)
 * dan mengorkestrasikan seluruh pipeline Agentic AI:
 *
 * 1. Validasi keamanan request (secret token)
 * 2. Ekstrak pesan dari Telegram Update payload
 * 3. Guardrail: Deteksi prompt injection
 * 4. Ambil konteks live (harga, stok, pengaturan toko) dari Supabase
 * 5. Bangun System Prompt + History percakapan
 * 6. Panggil Cloudflare Workers AI
 * 7. Parse respons: ekstrak ORDER_JSON jika ada
 * 8. Validasi & hitung harga di backend (Server Authority)
 * 9. Insert pesanan ke Supabase jika valid
 * 10. Kirim respons teks ke pelanggan via Telegram
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { runCloudflareAI } from "@/lib/cloudflare-ai/client";
import { fetchLiveContext, buildSystemPrompt } from "@/lib/agent/prompt-builder";
import {
  processUserInput,
  INJECTION_REJECTION_MESSAGE,
} from "@/lib/agent/guardrails";
import {
  extractOrderPayload,
  stripOrderPayload,
  validateAndPriceOrder,
} from "@/lib/agent/order-parser";
import {
  sendMessage,
  sendTypingAction,
  formatOrderConfirmation,
} from "@/lib/telegram/client";
import { ChatMessage } from "@/types/agent";
import { BotConversation } from "@/types/database";

/** Panjang maksimum riwayat percakapan yang disimpan per user */
const MAX_HISTORY_LENGTH = 10;

/** Telegram Update payload type (simplified) */
interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    chat: { id: number; username?: string; first_name?: string };
    from?: { id: number; username?: string; first_name?: string };
    text?: string;
    date: number;
  };
}

// ============================================================================
// ROUTE HANDLER
// ============================================================================

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    // ---- Langkah 1: Validasi Secret Token ----
    const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
    const headerSecret = req.headers.get("X-Telegram-Bot-Api-Secret-Token");

    if (webhookSecret && headerSecret !== webhookSecret) {
      console.warn("[WEBHOOK] Unauthorized: Invalid secret token");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ---- Langkah 2: Parse Telegram Update ----
    const update = (await req.json()) as TelegramUpdate;
    const message = update.message;

    // Hanya proses pesan teks biasa
    if (!message || !message.text || !message.chat?.id) {
      return NextResponse.json({ ok: true }); // Abaikan update non-teks
    }

    const chatId = message.chat.id;
    const rawUserText = message.text;
    const username = message.from?.username || message.chat.username;

    // Handle /start command
    if (rawUserText === "/start") {
      await sendMessage(
        chatId,
        `🌶️ *Halo! Selamat datang di UMKM Cabai Berkah!*\n\nSaya adalah *Bang Cabai*, asisten virtual Anda untuk informasi dan pemesanan cabai segar.\n\nSilakan tanyakan:\n• 📋 Harga cabai hari ini\n• 📦 Stok yang tersedia\n• 🛒 Cara pemesanan\n• ✂️  Jasa petik tangkai\n\nAda yang bisa saya bantu? 😊`
      );
      return NextResponse.json({ ok: true });
    }

    // ---- Langkah 3: Guardrail - Cek Prompt Injection ----
    const guardResult = processUserInput(rawUserText);

    if (guardResult.wasBlocked) {
      console.warn(`[GUARDRAIL] Blocked message from ${chatId}: ${guardResult.blockReason}`);
      await sendMessage(chatId, INJECTION_REJECTION_MESSAGE);
      return NextResponse.json({ ok: true });
    }

    // Kirim tanda mengetik untuk UX natural
    await sendTypingAction(chatId);

    // ---- Langkah 4: Ambil Riwayat Percakapan dari Supabase ----
    const supabase = createAdminClient();
    const { data: convData } = await supabase
      .from("bot_conversations")
      .select("conversation_history")
      .eq("chat_id", chatId)
      .single();

    const conversationHistory: ChatMessage[] =
      (convData?.conversation_history as ChatMessage[]) || [];

    // ---- Langkah 5 & 6: Ambil konteks live & Bangun prompt, lalu panggil AI ----
    const [liveContext] = await Promise.all([fetchLiveContext()]);

    // Tambahkan pesan user yang sudah disanitasi ke history
    const userMessageForAI: ChatMessage = {
      role: "user",
      content: guardResult.safeContent, // Input dalam XML sandbox
    };

    const messagesForAI = buildSystemPrompt(liveContext, [
      ...conversationHistory,
      userMessageForAI,
    ]);

    // Panggil Cloudflare AI
    const rawAIResponse = await runCloudflareAI({
      messages: messagesForAI,
      max_tokens: 1000,
      temperature: 0.3,
    });

    // ---- Langkah 7: Ekstrak ORDER_JSON jika ada ----
    const orderPayload = extractOrderPayload(rawAIResponse);
    const cleanTextResponse = stripOrderPayload(rawAIResponse);

    // ---- Langkah 8 & 9: Validasi & Insert pesanan jika ada ----
    if (orderPayload) {
      const validatedOrder = await validateAndPriceOrder(
        orderPayload,
        chatId,
        username
      );

      if (validatedOrder.errors.length === 0 && validatedOrder.items.length > 0) {
        // Insert pesanan ke database
        const { data: insertedOrder, error: insertOrderErr } = await supabase
          .from("orders")
          .insert(validatedOrder.order)
          .select()
          .single();

        if (!insertOrderErr && insertedOrder) {
          // Insert order items
          const itemsToInsert = validatedOrder.items.map((item) => ({
            ...item,
            order_id: (insertedOrder as Record<string, unknown>).id as string,
          }));

          await supabase.from("order_items").insert(itemsToInsert as Record<string, unknown>[]);

          // Kirim konfirmasi pesanan ke pelanggan
          const storeInfo = liveContext.storeSettings;
          const confirmMsg = formatOrderConfirmation({
            orderNumber: (insertedOrder as Record<string, unknown>).order_number as string,
            customerName: orderPayload.customer_name,
            items: validatedOrder.items.map((item) => ({
              name: item.product_name_snapshot,
              quantityKg: item.quantity_kg,
              stemRemoved: item.stem_removed,
              subtotal: item.subtotal,
            })),
            totalAmount: validatedOrder.order.total_amount,
            fulfillmentMethod: validatedOrder.order.fulfillment_method || "PICKUP",
            pickupTimeEstimate: validatedOrder.order.pickup_time_estimate,
            paymentInfo: storeInfo.payment_info,
          });

          await sendMessage(chatId, confirmMsg);
        } else {
          // Error database - kirim pesan error yang ramah
          await sendMessage(
            chatId,
            `😔 Maaf, ada kendala teknis saat menyimpan pesanan. Silakan coba lagi atau hubungi penjual langsung.\n\n_Pesan error: Database insert failed_`
          );
        }
      } else {
        // Ada error validasi (stok habis, produk tidak ditemukan, dll)
        const errorDetail = validatedOrder.errors.join("\n• ");
        await sendMessage(
          chatId,
          `⚠️ *Pesanan tidak dapat diproses:*\n\n• ${errorDetail}\n\nSilakan sesuaikan pesanan Anda atau tanyakan stok yang tersedia! 🌶️`
        );
      }
    } else {
      // Tidak ada pesanan - kirim respons teks AI biasa
      await sendMessage(chatId, cleanTextResponse);
    }

    // ---- Langkah 10: Update riwayat percakapan ----
    const updatedHistory: ChatMessage[] = [
      ...conversationHistory,
      { role: "user" as const, content: rawUserText }, // Simpan teks asli (bukan XML-wrapped) untuk konteks
      { role: "assistant" as const, content: cleanTextResponse },
    ].slice(-MAX_HISTORY_LENGTH); // Pertahankan hanya N pesan terakhir

    await supabase.from("bot_conversations").upsert({
      chat_id: chatId,
      conversation_history: updatedHistory as unknown as BotConversation["conversation_history"],
      last_interaction: new Date().toISOString(),
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[WEBHOOK] Unhandled error:", error);
    // Jangan lempar error ke Telegram (akan menyebabkan retry loop)
    return NextResponse.json({ ok: true });
  }
}

// Telegram hanya mengirim POST - tolak method lain
export async function GET(): Promise<NextResponse> {
  return NextResponse.json(
    { status: "Telegram Webhook Active", timestamp: new Date().toISOString() },
    { status: 200 }
  );
}
