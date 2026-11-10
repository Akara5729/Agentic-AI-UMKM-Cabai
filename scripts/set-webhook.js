// Helper script untuk registrasi Telegram Webhook
try {
  process.loadEnvFile(".env.local");
} catch (e) {
  // Gunakan process.env jika .env.local tidak ada
}

const domain = process.argv[2] || process.env.NEXT_PUBLIC_APP_URL;

if (!domain) {
  console.error("Usage: node scripts/set-webhook.js <domain-vercel>");
  console.error("Example: node scripts/set-webhook.js https://agenticaiumkmcabai.vercel.app");
  process.exit(1);
}

const botToken = process.env.TELEGRAM_BOT_TOKEN;
const secretToken = process.env.TELEGRAM_WEBHOOK_SECRET || "cabai_secret_webhook_token_2026";

if (!botToken) {
  console.error("❌ TELEGRAM_BOT_TOKEN tidak ditemukan di environment variables / .env.local!");
  process.exit(1);
}

const cleanDomain = domain.replace(/\/+$/, "");
const webhookUrl = `${cleanDomain}/api/telegram/webhook`;

console.log(`Setting webhook to: ${webhookUrl} ...`);

fetch(`https://api.telegram.org/bot${botToken}/setWebhook`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    url: webhookUrl,
    secret_token: secretToken,
    drop_pending_updates: true,
  }),
})
  .then((r) => r.json())
  .then((data) => {
    console.log("Response:", JSON.stringify(data, null, 2));
    if (data.ok) {
      console.log("\n✅ Webhook Telegram BERHASIL diaktifkan!");
    } else {
      console.error("\n❌ Gagal mengaktifkan webhook:", data.description);
    }
  })
  .catch((err) => {
    console.error("Network error:", err.message);
  });
