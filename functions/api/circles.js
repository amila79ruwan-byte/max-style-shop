import { readJson } from "../_lib/json.js";
// Photos for the round category buttons on the home page (Dresses, Phone, School, Bags).
// Public GET: { key: "/api/circle-image?key=..&v=.." } for the circles that have a photo.
// Admin (password): POST {key, image} sets a photo, DELETE ?key= removes it.
// The table is created automatically the first time, so no SQL has to be run.
const J = (d, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { "content-type": "application/json" } });
const ok = (r, e) => e.ADMIN_PASSWORD && r.headers.get("x-admin-password") === e.ADMIN_PASSWORD;
const KEYS = ["dresses", "phone", "school", "bags"];

async function ensure(env) {
  await env.DB.prepare("CREATE TABLE IF NOT EXISTS circle_photos (k TEXT PRIMARY KEY, image TEXT NOT NULL, updated INTEGER DEFAULT 0)").run();
}
const safe = fn => async ctx => {
  try { return await fn(ctx); }
  catch (e) { return J({ error: "Server error: " + (e && e.message ? e.message : String(e)) }, 500); }
};

export const onRequestGet = safe(async ({ env }) => {
  await ensure(env);
  const { results } = await env.DB.prepare("SELECT k,updated FROM circle_photos").all();
  const out = {};
  for (const r of results) if (KEYS.includes(r.k)) out[r.k] = "/api/circle-image?key=" + r.k + "&v=" + r.updated;
  return J(out);
});

export const onRequestPost = safe(async ({ request, env }) => {
  if (!ok(request, env)) return J({ error: "Wrong password" }, 401);
  const b = await readJson(request);
  if (!b) return J({ error: "Bad request" }, 400);
  const key = String(b.key || "");
  if (!KEYS.includes(key)) return J({ error: "Unknown circle" }, 400);
  if (!b.image || !String(b.image).startsWith("data:image/")) return J({ error: "Choose a photo file" }, 400);
  await ensure(env);
  await env.DB.prepare("INSERT INTO circle_photos (k,image,updated) VALUES (?,?,?) ON CONFLICT(k) DO UPDATE SET image=excluded.image, updated=excluded.updated")
    .bind(key, b.image, Date.now()).run();
  return J({ ok: true });
});

export const onRequestDelete = safe(async ({ request, env }) => {
  if (!ok(request, env)) return J({ error: "Wrong password" }, 401);
  const key = new URL(request.url).searchParams.get("key");
  await ensure(env);
  await env.DB.prepare("DELETE FROM circle_photos WHERE k=?").bind(key).run();
  return J({ ok: true });
});
