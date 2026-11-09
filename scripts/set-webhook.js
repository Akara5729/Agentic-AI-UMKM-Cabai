// Helper script untuk registrasi Telegram Webhook
const domain = process.argv[2];

if (!domain) {
  console.error("Usage: node scripts/set-webhook.js <domain-vercel>");
  console.error("Example: node scripts/set-webhook.js https://agentic-ai-umkm-cabai-xxx.vercel.app");
  process.exit(1);
}

const cleanDomain = domain.replace(/\/+$/, "");
const webhookUrl = `${cleanDomain}/api/telegram/webhook`;
const botToken = "9167950971:AAGbzLFr0SW8NKHsWj1t0WuSoDa8mbPIX0o";
const secretToken = "cabai_secret_webhook_token_2026";

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
