// Sends a plain-text message to the shop owner on Telegram.
// Only works when TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID are set in Cloudflare Pages. Never throws.
export async function sendTelegram(env, text) {
  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) return;
  try {
    await fetch("https://api.telegram.org/bot" + env.TELEGRAM_BOT_TOKEN + "/sendMessage", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ chat_id: env.TELEGRAM_CHAT_ID, text }),
      signal: AbortSignal.timeout(4000)
    });
  } catch (e) { /* an alert problem must never affect the shop */ }
}
