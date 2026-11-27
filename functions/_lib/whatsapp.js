// Sends the verification code through the WhatsApp Business Cloud API (Meta), using an approved "Authentication" template.
// Needs Cloudflare Pages secrets: WA_TOKEN (permanent access token), WA_PHONE_ID (phone number id), WA_TEMPLATE (template name).
// Optional: WA_LANG (template language, default "en"), WA_API_VERSION (default "v21.0").
// Never throws; returns true when Meta accepted the message.
import { toIntl } from "./sms.js";

export const waEnabled = env => !!(env.WA_TOKEN && env.WA_PHONE_ID && env.WA_TEMPLATE);

export async function sendWhatsappOtp(env, phone, code) {
  if (!waEnabled(env)) return false;
  try {
    const r = await fetch("https://graph.facebook.com/" + (env.WA_API_VERSION || "v21.0") + "/" + env.WA_PHONE_ID + "/messages", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: "Bearer " + env.WA_TOKEN },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: toIntl(phone),
        type: "template",
        template: {
          name: env.WA_TEMPLATE,
          language: { code: env.WA_LANG || "en" },
          // Authentication templates carry the code in the body and in the "copy code" button.
          components: [
            { type: "body", parameters: [{ type: "text", text: code }] },
            { type: "button", sub_type: "url", index: "0", parameters: [{ type: "text", text: code }] }
          ]
        }
      }),
      signal: AbortSignal.timeout(6000)
    });
    return r.ok;
  } catch (e) { return false; }
}
