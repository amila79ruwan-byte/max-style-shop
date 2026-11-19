// Home page banners (slideshow). Public: the shown banners. Admin (password): all banners, add, edit, delete.
const J = (d, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { "content-type": "application/json" } });
const ok = (r, e) => e.ADMIN_PASSWORD && r.headers.get("x-admin-password") === e.ADMIN_PASSWORD;
const MAX_BANNERS = 6;

// Any unexpected error comes back as JSON with the message, instead of a blank Cloudflare error page.
const safe = fn => async ctx => {
  try { return await fn(ctx); }
  catch (e) { return J({ error: "Server error: " + (e && e.message ? e.message : String(e)) }, 500); }
};

export const onRequestGet = safe(async ({ request, env }) => {
  if (ok(request, env)) {
    const { results } = await env.DB.prepare("SELECT id,image,text,link,pos,active FROM banners ORDER BY pos,id").all();
    return J(results);
  }
  const { results } = await env.DB.prepare(
    "SELECT id,image,text,link,pos FROM banners WHERE active=1 ORDER BY pos,id LIMIT ?"
  ).bind(MAX_BANNERS).all();
  return J(results);
});

export const onRequestPost = safe(async ({ request, env }) => {
  if (!ok(request, env)) return J({ error: "Wrong password" }, 401);
  const b = await request.json();
  const text = String(b.text || "").trim().slice(0, 120);
  const link = String(b.link || "").trim().slice(0, 300);
  const pos = parseInt(b.pos, 10) || 0;
  const active = b.active ? 1 : 0;
  if (b.image && !String(b.image).startsWith("data:image/")) return J({ error: "Choose a photo file" }, 400);

  if (b.id) {
    if (b.image) await env.DB.prepare("UPDATE banners SET image=? WHERE id=?").bind(b.image, b.id).run();
    await env.DB.prepare("UPDATE banners SET text=?,link=?,pos=?,active=? WHERE id=?").bind(text, link, pos, active, b.id).run();
    return J({ ok: true, id: b.id });
  }

  if (!b.image) return J({ error: "Choose a photo" }, 400);
  const c = await env.DB.prepare("SELECT COUNT(*) AS n FROM banners").first();
  if (c && c.n >= MAX_BANNERS) return J({ error: "You can have up to " + MAX_BANNERS + " banners. Delete one first." }, 400);
  const r = await env.DB.prepare(
    "INSERT INTO banners (image,text,link,pos,active,created) VALUES (?,?,?,?,?,?)"
  ).bind(b.image, text, link, pos, active, Date.now()).run();
  return J({ ok: true, id: r.meta.last_row_id });
});

export const onRequestDelete = safe(async ({ request, env }) => {
  if (!ok(request, env)) return J({ error: "Wrong password" }, 401);
  const id = new URL(request.url).searchParams.get("id");
  await env.DB.prepare("DELETE FROM banners WHERE id=?").bind(id).run();
  return J({ ok: true });
});
