/**
 * Guardrails - Multi-Layer Anti-Prompt Injection Defense System
 *
 * Lapisan pertahanan sebelum input pengguna diteruskan ke LLM:
 * 1. XML Sandboxing: Isolasi input dalam tag <user_query>
 * 2. Keyword Firewall: Deteksi dini pola jailbreak umum
 * 3. Length Limiter: Cegah prompt flooding
 */

/** Pola regex untuk deteksi upaya prompt injection / jailbreak */
const INJECTION_PATTERNS: RegExp[] = [
  /ignore\s+(all\s+)?(previous|prior|above|your)\s+(instructions?|rules?|prompts?|constraints?)/i,
  /forget\s+(everything|all|your|previous)/i,
  /you\s+are\s+now\s+a?n?\s+/i,
  /pretend\s+(you\s+are|to\s+be)/i,
  /act\s+as\s+(if\s+you\s+are|a\s+)/i,
  /\[system\]/i,
  /<\s*system\s*>/i,
  /reveal\s+(your|the)\s+(system\s+)?prompt/i,
  /show\s+me\s+your\s+(system\s+)?prompt/i,
  /what\s+are\s+your\s+instructions/i,
  /lupakan\s+(semua|instruksi|perintah)/i,
  /abaikan\s+(instruksi|perintah|aturan)\s+(sebelumnya|lama|sistem)/i,
  /kamu\s+sekarang\s+adalah/i,
  /pura[\s-]pura\s+jadi/i,
  /DROP\s+TABLE/i,
  /<\s*\/?\s*user_query\s*>/i, // Jangan biarkan user menutup/membuka tag sandbox
];

/**
 * Memeriksa apakah input mengandung pola prompt injection
 * @returns { isInjection: boolean, detectedPattern?: string }
 */
export function detectInjection(userInput: string): {
  isInjection: boolean;
  detectedPattern?: string;
} {
  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(userInput)) {
      return { isInjection: true, detectedPattern: pattern.source };
    }
  }
  return { isInjection: false };
}

/**
 * Membersihkan dan mengamankan input pengguna:
 * 1. Potong karakter berlebih (maks 2000 karakter)
 * 2. Hapus karakter kontrol berbahaya
 * 3. Bungkus dalam tag XML sandbox
 */
export function sanitizeUserInput(rawInput: string): string {
  // 1. Potong input terlalu panjang (DoS prevention)
  const maxLength = 2000;
  let sanitized = rawInput.slice(0, maxLength);

  // 2. Hapus null bytes dan karakter kontrol berbahaya
  sanitized = sanitized.replace(/\0/g, "").replace(/[\x01-\x08\x0B-\x1F\x7F]/g, "");

  // 3. Bungkus dalam XML sandbox - LLM diperintahkan untuk tidak memperlakukan
  //    isi tag ini sebagai instruksi sistem
  return `<user_query>\n${sanitized}\n</user_query>`;
}

/**
 * Fungsi utama proteksi input - Gunakan ini di webhook sebelum mengirim ke LLM
 *
 * @returns {object} Berisi pesan yang sudah disanitasi atau respons penolakan jika ada injection
 */
export function processUserInput(rawInput: string): {
  safeContent: string;
  wasBlocked: boolean;
  blockReason?: string;
} {
  // Cek panjang minimal
  if (!rawInput || rawInput.trim().length === 0) {
    return {
      safeContent: "",
      wasBlocked: true,
      blockReason: "Input kosong",
    };
  }

  // Jalankan injection detector
  const { isInjection, detectedPattern } = detectInjection(rawInput);

  if (isInjection) {
    console.warn(
      `[GUARDRAIL] Prompt injection attempt detected. Pattern: ${detectedPattern}. Input (first 100): ${rawInput.substring(0, 100)}`
    );
    return {
      safeContent: "",
      wasBlocked: true,
      blockReason: `Pola injeksi terdeteksi`,
    };
  }

  // Input aman - sanitasi dan bungkus
  const safeContent = sanitizeUserInput(rawInput);

  return {
    safeContent,
    wasBlocked: false,
  };
}

/**
 * Pesan penolakan standar yang dikirim ke user ketika injeksi terdeteksi
 */
export const INJECTION_REJECTION_MESSAGE =
  "Maaf, pesan Anda tidak dapat diproses. 🙏\n\nSaya adalah asisten Bang Cabai yang hanya melayani informasi dan pemesanan cabai di toko kami. Silakan tanyakan soal harga, stok, atau pemesanan cabai ya!";
