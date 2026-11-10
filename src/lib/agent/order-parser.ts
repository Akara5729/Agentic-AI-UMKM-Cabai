/**
 * Order Parser - Server-Side JSON Extractor & Price Validator
 *
 * Bertanggung jawab untuk:
 * 1. Mengekstrak blok ```json:order``` dari respons teks LLM
 * 2. Memvalidasi produk berdasarkan database (bukan klaim LLM)
 * 3. Menghitung total harga MUTLAK di sisi backend (LLM tidak dipercaya untuk matematika)
 * 4. Menyiapkan payload siap insert ke tabel Supabase orders
 */

import { createAdminClient } from "@/lib/supabase/server";
import { ExtractedOrderPayload, ExtractedOrderItem } from "@/types/agent";
import { Order, OrderItem, Product } from "@/types/database";

/**
 * Mengekstrak payload JSON order dari respons teks LLM.
 * Mendukung format ```json:order, ```json, maupun objek JSON mentah.
 */
export function extractOrderPayload(
  llmResponse: string
): ExtractedOrderPayload | null {
  // 1. Coba match kode block ```json:order atau ```json
  const blockMatch = llmResponse.match(
    /```(?:json:order|json)?\s*(\{[\s\S]*?"action"\s*:\s*"CREATE_ORDER"[\s\S]*?\})\s*```/i
  );
  let jsonString = blockMatch ? blockMatch[1] : null;

  // 2. Fallback: Cari blok objek JSON mentah yang memuat "action": "CREATE_ORDER"
  if (!jsonString) {
    const rawMatch = llmResponse.match(
      /(\{[\s\S]*?"action"\s*:\s*"CREATE_ORDER"[\s\S]*?\})/i
    );
    jsonString = rawMatch ? rawMatch[1] : null;
  }

  if (!jsonString) {
    return null; // Tidak ada pesanan dalam respons ini
  }

  try {
    const payload = JSON.parse(jsonString.trim()) as ExtractedOrderPayload;

    // Validasi struktur minimal
    if (
      payload.action === "CREATE_ORDER" &&
      Array.isArray(payload.items) &&
      payload.items.length > 0
    ) {
      return payload;
    }

    console.warn("[ORDER PARSER] Invalid order structure:", jsonString);
    return null;
  } catch (err) {
    console.error("[ORDER PARSER] Failed to parse JSON block:", err);
    return null;
  }
}

/**
 * Membersihkan respons teks LLM dari blok JSON tersembunyi
 * sebelum dikirim ke pelanggan
 */
export function stripOrderPayload(llmResponse: string): string {
  return llmResponse
    .replace(/```(?:json:order|json)?\s*\{[\s\S]*?"action"\s*:\s*"CREATE_ORDER"[\s\S]*?\}\s*```/gi, "")
    .replace(/\{[\s\S]*?"action"\s*:\s*"CREATE_ORDER"[\s\S]*?\}/gi, "")
    .trim();
}

export interface ValidatedOrder {
  order: Omit<Order, "id" | "created_at" | "updated_at">;
  items: Array<Omit<OrderItem, "id" | "order_id" | "created_at">>;
  errors: string[];
}

/**
 * FUNGSI UTAMA OTORITAS FINANSIAL BACKEND:
 *
 * Menerima payload mentah dari LLM, memvalidasi semua produk dan harga
 * dari database (bukan dari klaim LLM), dan menghitung total secara
 * deterministik di sisi server.
 *
 * LLM TIDAK DIPERCAYA untuk:
 * - Memastikan harga yang benar
 * - Memvalidasi ketersediaan stok
 * - Menghitung subtotal atau total
 */
export async function validateAndPriceOrder(
  payload: ExtractedOrderPayload,
  telegramChatId: number,
  customerUsername?: string
): Promise<ValidatedOrder> {
  const supabase = createAdminClient();
  const errors: string[] = [];
  const validatedItems: Array<Omit<OrderItem, "id" | "order_id" | "created_at">> = [];

  // Ambil semua produk yang tersedia dari database
  const { data: products, error: productError } = await supabase
    .from("products")
    .select("*")
    .eq("is_available", true);

  if (productError || !products) {
    errors.push("Gagal memuat data produk dari database");
    return { order: buildEmptyOrder(payload, telegramChatId, customerUsername), items: [], errors };
  }

  // Buat map untuk pencarian efisien
  const productMap = new Map<string, Product>();
  for (const p of products) {
    productMap.set(p.name.toLowerCase(), p as Product);
    productMap.set(p.slug, p as Product);
    if (p.id) productMap.set(p.id, p as Product);
  }

  // Dapatkan biaya petik tangkai dari store settings
  const { data: storeData } = await supabase
    .from("store_settings")
    .select("stem_removal_fee_per_kg")
    .limit(1)
    .single();
  const stemFeePerKg = storeData?.stem_removal_fee_per_kg ?? 2000;

  let totalAmount = 0;

  for (const itemPayload of payload.items) {
    // Cari produk yang cocok dari database berdasarkan nama yang disebutkan LLM
    const searchKey = (itemPayload.product_name || itemPayload.product_id || "").toLowerCase();
    let matchedProduct: Product | undefined;

    // Normalisasi cabe -> cabai dan pencarian berbasis skoring kata kunci
    const normKey = searchKey.replace(/cabe/g, "cabai").trim();
    const keyWords = normKey.split(/\s+/).filter((w) => w.length > 2);

    let bestScore = 0;
    for (const p of products) {
      const pNameLower = p.name.toLowerCase();
      // Match langsung
      if (pNameLower === normKey || p.slug === searchKey) {
        matchedProduct = p as Product;
        break;
      }
      // Hitung kata yang cocok (misal 'rawit' & 'merah')
      let score = 0;
      for (const kw of keyWords) {
        if (pNameLower.includes(kw)) score += 2;
      }
      if (pNameLower.includes(normKey) || normKey.includes(pNameLower)) {
        score += 3;
      }
      if (score > bestScore) {
        bestScore = score;
        matchedProduct = p as Product;
      }
    }

    if (!matchedProduct || bestScore === 0) {
      errors.push(
        `Produk "${itemPayload.product_name || itemPayload.product_id}" tidak ditemukan dalam katalog.`
      );
      continue;
    }

    // Validasi stok mencukupi
    if (matchedProduct.stock_kg < itemPayload.quantity_kg) {
      errors.push(
        `Stok ${matchedProduct.name} tidak mencukupi. Tersedia: ${matchedProduct.stock_kg} kg, diminta: ${itemPayload.quantity_kg} kg.`
      );
      continue;
    }

    // ✅ HITUNG HARGA DI BACKEND - LLM tidak terlibat dalam kalkulasi ini
    const stemFee = itemPayload.stem_removed
      ? stemFeePerKg * itemPayload.quantity_kg
      : 0;
    const productSubtotal =
      matchedProduct.current_price_per_kg * itemPayload.quantity_kg + stemFee;

    totalAmount += productSubtotal;

    validatedItems.push({
      product_id: matchedProduct.id,
      product_name_snapshot: matchedProduct.name,
      price_per_kg_snapshot: matchedProduct.current_price_per_kg,
      quantity_kg: itemPayload.quantity_kg,
      stem_removed: itemPayload.stem_removed,
      stem_removal_fee: stemFee,
      subtotal: productSubtotal,
    });
  }

  // Generate nomor pesanan unik yang aman dari tabrakan duplikat
  const now = new Date();
  const dateStr =
    now.getFullYear().toString() +
    String(now.getMonth() + 1).padStart(2, "0") +
    String(now.getDate()).padStart(2, "0");
  const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
  const orderNumber = `CAB-${dateStr}-${randomSuffix}`;

  // Normalisasi fulfillment_method agar 100% cocok dengan enum PostgreSQL
  let fulfillmentMethod: "PICKUP" | "DELIVERY_COURIER" = "PICKUP";
  if (payload.fulfillment_method) {
    const fm = String(payload.fulfillment_method).toUpperCase();
    if (
      fm.includes("DELIVER") ||
      fm.includes("KURIR") ||
      fm.includes("ANTAR") ||
      fm.includes("KIRIM")
    ) {
      fulfillmentMethod = "DELIVERY_COURIER";
    } else {
      fulfillmentMethod = "PICKUP";
    }
  }

  const order: Omit<Order, "id" | "created_at" | "updated_at"> = {
    order_number: orderNumber,
    telegram_chat_id: telegramChatId,
    customer_name:
      payload.customer_name && payload.customer_name !== "Belum Diketahui"
        ? payload.customer_name
        : "Pelanggan Cabai",
    customer_username: customerUsername || null,
    status: "PENDING",
    fulfillment_method: fulfillmentMethod,
    pickup_time_estimate: payload.pickup_time_estimate || null,
    total_amount: totalAmount,
    notes: payload.notes || null,
  };

  return { order, items: validatedItems, errors };
}

/** Helper untuk membuat order kosong saat validasi gagal total */
function buildEmptyOrder(
  payload: ExtractedOrderPayload,
  telegramChatId: number,
  customerUsername?: string
): Omit<Order, "id" | "created_at" | "updated_at"> {
  return {
    order_number: `CAB-ERROR-${Date.now()}`,
    telegram_chat_id: telegramChatId,
    customer_name: payload.customer_name,
    customer_username: customerUsername || null,
    status: "CANCELLED",
    fulfillment_method: payload.fulfillment_method || "PICKUP",
    pickup_time_estimate: null,
    total_amount: 0,
    notes: "Order gagal divalidasi",
  };
}
