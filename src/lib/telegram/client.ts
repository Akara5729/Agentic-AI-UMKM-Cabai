/**
 * Telegram Bot API Client
 *
 * Helper untuk mengirim pesan ke Telegram via Bot API.
 * Mendukung Markdown formatting dan Telegram keyboard.
 */

const TELEGRAM_API_BASE = "https://api.telegram.org";

function getBotToken(): string {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN tidak ditemukan di env");
  return token;
}

/**
 * Kirim pesan teks ke chat_id Telegram tertentu
 */
export async function sendMessage(
  chatId: number,
  text: string,
  options: {
    parseMode?: "Markdown" | "MarkdownV2" | "HTML";
    disableNotification?: boolean;
    replyMarkup?: object;
  } = {}
): Promise<boolean> {
  const token = getBotToken();
  const url = `${TELEGRAM_API_BASE}/bot${token}/sendMessage`;

  const body: Record<string, unknown> = {
    chat_id: chatId,
    text,
    parse_mode: options.parseMode || "Markdown",
    disable_notification: options.disableNotification || false,
  };

  if (options.replyMarkup) {
    body.reply_markup = options.replyMarkup;
  }

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(`[TG] sendMessage error ${res.status}:`, errText.substring(0, 200));
      return false;
    }

    return true;
  } catch (err) {
    console.error("[TG] sendMessage network error:", err);
    return false;
  }
}

/**
 * Kirim tanda "sedang mengetik..." ke chat untuk UX yang lebih alami
 */
export async function sendTypingAction(chatId: number): Promise<void> {
  const token = getBotToken();
  const url = `${TELEGRAM_API_BASE}/bot${token}/sendChatAction`;

  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, action: "typing" }),
  }).catch(() => {}); // Abaikan error untuk action ini
}

/**
 * Memformat ringkasan pesanan yang cantik untuk dikirim ke pelanggan
 */
export function formatOrderConfirmation(params: {
  orderNumber: string;
  customerName: string;
  items: Array<{
    name: string;
    quantityKg: number;
    stemRemoved: boolean;
    subtotal: number;
  }>;
  totalAmount: number;
  fulfillmentMethod: string;
  pickupTimeEstimate?: string | null;
  paymentInfo: string;
}): string {
  const { orderNumber, customerName, items, totalAmount, fulfillmentMethod, pickupTimeEstimate, paymentInfo } = params;

  const itemLines = items
    .map((item) => {
      const harga = new Intl.NumberFormat("id-ID").format(item.subtotal);
      const kustom = item.stemRemoved ? " _(dipetikin)_" : "";
      return `  • ${item.name} ${item.quantityKg} kg${kustom} → *Rp ${harga}*`;
    })
    .join("\n");

  const total = new Intl.NumberFormat("id-ID").format(totalAmount);
  const metode = fulfillmentMethod === "PICKUP" ? "🏪 Ambil sendiri di kios" : "🛵 Kurir mandiri (GoSend/Grab)";
  const waktu = pickupTimeEstimate ? `\n⏰ *Estimasi:* ${pickupTimeEstimate}` : "";

  return `✅ *Pesanan Diterima!*

🧾 Nomor Antrean: *${orderNumber}*
👤 Nama: ${customerName}

📦 *Detail Pesanan:*
${itemLines}

💰 *Total Estimasi: Rp ${total}*
_(Total resmi dikonfirmasi admin)_

📌 *Metode Pengambilan:* ${metode}${waktu}

💳 *Cara Bayar:* ${paymentInfo}

⏳ _Mohon tunggu ya, penjual sedang memproses pesanan Anda. Anda akan mendapat notifikasi saat pesanan dikonfirmasi!_`;
}

/**
 * Memformat pesan notifikasi perubahan status pesanan
 */
export function formatStatusUpdateMessage(
  orderNumber: string,
  status: string,
  storeName: string
): string {
  const statusMessages: Record<string, string> = {
    CONFIRMED: `✅ *Pesanan Dikonfirmasi!*\n\nHai! Pesanan Anda *${orderNumber}* telah dikonfirmasi oleh ${storeName}.\n\nSilakan siapkan pembayaran sesuai instruksi yang telah diberikan. Kami akan memberitahu Anda kembali saat pesanan siap! 🌶️`,
    PREPARING: `🔪 *Pesanan Sedang Diproses!*\n\nPesanan Anda *${orderNumber}* sedang ditimbang dan disiapkan oleh ${storeName}.\n\nMohon tunggu sebentar ya! 🌶️`,
    READY: `🎉 *Pesanan Siap!*\n\nHoreee! Pesanan Anda *${orderNumber}* sudah *SIAP* diambil/dikirim dari ${storeName}!\n\nSegera ambil pesanan Anda ya! 🌶️🛵`,
    COMPLETED: `🏁 *Transaksi Selesai!*\n\nTerima kasih telah berbelanja di *${storeName}*!\n\nPesanan *${orderNumber}* telah selesai. Semoga cabainya segar dan memuaskan! 🌶️🙏`,
    CANCELLED: `❌ *Pesanan Dibatalkan*\n\nMaaf, pesanan Anda *${orderNumber}* terpaksa dibatalkan karena stok tidak mencukupi atau ada kendala.\n\nSilakan hubungi kami untuk informasi lebih lanjut. 🙏`,
  };

  return statusMessages[status] || `ℹ️ Status pesanan *${orderNumber}* telah diperbarui menjadi: *${status}*`;
}
