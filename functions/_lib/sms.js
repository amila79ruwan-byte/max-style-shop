// Sends an SMS through Notify.lk (Sri Lankan SMS gateway). Never throws; returns true when the gateway accepted it.
// Needs these Cloudflare Pages secrets: NOTIFYLK_USER_ID, NOTIFYLK_API_KEY, NOTIFYLK_SENDER_ID (sender id is optional for the trial id "NotifyDEMO").
// To use another provider (Text.lk, Dialog...), only this function has to change.
export const smsEnabled = env => !!(env.NOTIFYLK_USER_ID && env.NOTIFYLK_API_KEY);

// 0771234567 / 94771234567 / +94 77 123 4567  ->  94771234567
export const toIntl = phone => "94" + String(phone || "").replace(/\D/g, "").slice(-9);

export async function sendSms(env, phone, message) {
  if (!smsEnabled(env)) return false;
  try {
    const body = new URLSearchParams({
      user_id: env.NOTIFYLK_USER_ID,
      api_key: env.NOTIFYLK_API_KEY,
      sender_id: env.NOTIFYLK_SENDER_ID || "NotifyDEMO",
      to: toIntl(phone),
      message
    });
    const r = await fetch("https://app.notify.lk/api/v1/send", { method: "POST", body, signal: AbortSignal.timeout(6000) });
    const d = await r.json().catch(() => ({}));
    return r.ok && d.status === "success";
  } catch (e) { return false; }
}
