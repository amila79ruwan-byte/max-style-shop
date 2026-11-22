import { readJson } from "../_lib/json.js";
import { hit } from "../_lib/ratelimit.js";
import { sendTelegram } from "../_lib/notify.js";
// Bank / online payment slip photos.
//  POST (customer): { code, phone, image }  -> order code + phone must match; saves the photo, moves the order to "slip_sent".
//  GET  (admin only, password): ?order=ID    -> [{ id, image, created }]  (the photos are never public: they show bank details)
const J = (d, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { "content-type": "application/json", "cache-control": "no-store" } });
const ok = (r, e) => e.ADMIN_PASSWORD && r.headers.get("x-admin-password") === e.ADMIN_PASSWORD;
const last9 = p => String(p || "").replace(/\D/g, "").slice(-9);
const clientIp = r => r.headers.get("cf-connecting-ip") || "unknown";
const IMG = /^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+\/]+=*$/;
const MAX_CHARS = 700000;   // about 500 KB of picture (the app shrinks photos before sending)
const MAX_SLIPS = 3;        // per order

export async function onRequestPost(context) {
  const { request, env } = context;
  const b = await readJson(request);
  if (!b) return J({ error: "Bad request" }, 400);
  const m = String(b.code || "").trim().toUpperCase().match(/^MS-(\d+)$/);
  const pn = last9(b.phone);
  const image = String(b.image || "");
  if (!m || pn.length !== 9) return J({ error: "Invalid details" }, 400);
  if (image.length > MAX_CHARS) return J({ error: "Photo is too big. Please choose a smaller photo." }, 413);
  if (!IMG.test(image)) return J({ error: "Please choose a photo (JPG, PNG or WEBP)." }, 400);
  if (!(await hit(env, "slipup:" + clientIp(request), 20, 3600000))) return J({ error: "Too many tries. Please try again later." }, 429);

  const id = Number(m[1]) - 1000;
  const o = await env.DB.prepare("SELECT id,name,total,payment,pay_state,status FROM orders WHERE id=? AND phone_norm=?").bind(id, pn).first();
  if (!o || o.payment === "cod" || o.status === "cancelled") return J({ error: "Order not found" }, 404);
  if (o.pay_state === "paid") return J({ error: "This order is already marked as paid." }, 400);
  const c = await env.DB.prepare("SELECT COUNT(*) AS n FROM order_slips WHERE order_id=?").bind(id).first();
  if (c && c.n >= MAX_SLIPS) return J({ error: "You already sent " + MAX_SLIPS + " slips for this order. Please WhatsApp us." }, 400);

  await env.DB.batch([
    env.DB.prepare("INSERT INTO order_slips (order_id,image,created) VALUES (?,?,?)").bind(id, image, Date.now()),
    env.DB.prepare("UPDATE orders SET pay_state='slip_sent' WHERE id=? AND pay_state IN ('awaiting','slip_sent')").bind(id)
  ]);
  try { context.waitUntil(sendTelegram(env, "Slip received for " + m[0] + " - " + o.name + " - Rs. " + o.total + "\nOpen admin > Orders > View slip, then Mark as paid.")); } catch (e) {}
  return J({ ok: true });
}

export async function onRequestGet({ request, env }) {
  if (!ok(request, env)) return J({ error: "Wrong password" }, 401);
  const id = Number(new URL(request.url).searchParams.get("order"));
  if (!id) return J([]);
  const { results } = await env.DB.prepare("SELECT id,image,created FROM order_slips WHERE order_id=? ORDER BY id").bind(id).all();
  return J(results);
}
