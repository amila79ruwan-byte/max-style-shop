// One-time SMS codes (6 digits, valid 5 minutes, max 5 wrong tries, 60 s between sends).
// Codes are stored only as SHA-256 hashes. Uses the otp_codes table (see migrate_otp.sql / schema.sql).
import { hit } from "./ratelimit.js";
import { sendSms, smsEnabled, toIntl } from "./sms.js";
import { sendWhatsappOtp, waEnabled } from "./whatsapp.js";

const OTP_TTL = 5 * 60 * 1000;
const RESEND_MS = 60 * 1000;
const MAX_TRIES = 5;
const VERIFIED_MS = 15 * 60 * 1000;   // after a correct code the phone counts as verified for 15 min (to finish signup)
const enc = new TextEncoder();
const hex = b => [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, "0")).join("");
const codeHash = async (env, key, purpose, code) =>
  hex(await crypto.subtle.digest("SHA-256", enc.encode((env.PIN_PEPPER || "") + ":otp:" + key + ":" + purpose + ":" + code)));

// Codes are needed as soon as WhatsApp or SMS is set up. WhatsApp is tried first (cheaper); SMS is the fallback.
export const otpRequired = env => waEnabled(env) || smsEnabled(env);

// Sends a code. Returns { ok:true } or { error, status }.
export async function sendOtp(env, phone, purpose, ip) {
  const key = toIntl(phone);
  if (!(await hit(env, "otpip:" + ip, 10, 3600000))) return { error: "Too many codes requested. Try again later.", status: 429 };
  if (!(await hit(env, "otpph:" + key, 5, 3600000))) return { error: "Too many codes for this number. Try again in an hour.", status: 429 };
  const now = Date.now();
  const row = await env.DB.prepare("SELECT last_sent FROM otp_codes WHERE phone=? AND purpose=?").bind(key, purpose).first();
  if (row && now - row.last_sent < RESEND_MS) {
    return { error: "Please wait " + Math.ceil((RESEND_MS - (now - row.last_sent)) / 1000) + " seconds before asking for a new code.", status: 429 };
  }
  const code = String(crypto.getRandomValues(new Uint32Array(1))[0] % 1000000).padStart(6, "0");
  await env.DB.prepare(
    "INSERT INTO otp_codes (phone,purpose,code_hash,expires,tries,last_sent,verified_until) VALUES (?,?,?,?,0,?,0) " +
    "ON CONFLICT(phone,purpose) DO UPDATE SET code_hash=excluded.code_hash, expires=excluded.expires, tries=0, last_sent=excluded.last_sent, verified_until=0"
  ).bind(key, purpose, await codeHash(env, key, purpose, code), now + OTP_TTL, now).run();
  let ok = await sendWhatsappOtp(env, phone, code);
  if (!ok) ok = await sendSms(env, phone, "Max Style verification code: " + code + ". Valid for 5 minutes. Do not share it with anyone.");
  if (!ok) return { error: "Could not send the code. Please check the number and try again.", status: 502 };
  return { ok: true };
}

// Checks a code. consume=true deletes it on success (single use); consume=false keeps a "verified" mark instead.
export async function checkOtp(env, phone, purpose, code, consume) {
  const key = toIntl(phone), now = Date.now();
  code = String(code || "").trim();
  if (!/^\d{6}$/.test(code)) return false;
  const row = await env.DB.prepare("SELECT code_hash,expires,tries FROM otp_codes WHERE phone=? AND purpose=?").bind(key, purpose).first();
  if (!row || row.expires < now || row.tries >= MAX_TRIES) return false;
  await env.DB.prepare("UPDATE otp_codes SET tries=tries+1 WHERE phone=? AND purpose=?").bind(key, purpose).run();
  const given = await codeHash(env, key, purpose, code);
  let d = 0;
  for (let i = 0; i < given.length; i++) d |= given.charCodeAt(i) ^ row.code_hash.charCodeAt(i);
  if (d !== 0) return false;
  if (consume) await env.DB.prepare("DELETE FROM otp_codes WHERE phone=? AND purpose=?").bind(key, purpose).run();
  else await env.DB.prepare("UPDATE otp_codes SET code_hash='', verified_until=? WHERE phone=? AND purpose=?").bind(now + VERIFIED_MS, key, purpose).run();
  return true;
}
