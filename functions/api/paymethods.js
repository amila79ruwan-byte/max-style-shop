// Payment methods (bank deposit / online transfer). Public: the active ones. Admin (password): all, add, edit, delete.
const J = (d, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { "content-type": "application/json" } });
const ok = (r, e) => e.ADMIN_PASSWORD && r.headers.get("x-admin-password") === e.ADMIN_PASSWORD;
const TYPES = ["bank", "online"];
const MAX_METHODS = 10;

const safe = fn => async ctx => {
  try { return await fn(ctx); }
  catch (e) { return J({ error: "Server error: " + (e && e.message ? e.message : String(e)) }, 500); }
};

export const onRequestGet = safe(async ({ request, env }) => {
  if (ok(request, env)) {
    const { results } = await env.DB.prepare("SELECT id,type,title,details,sort,active FROM pay_methods ORDER BY sort,id").all();
    return J(results);
  }
  const { results } = await env.DB.prepare(
    "SELECT id,type,title,details FROM pay_methods WHERE active=1 ORDER BY sort,id"
  ).all();
  return J(results);
});

export const onRequestPost = safe(async ({ request, env }) => {
  if (!ok(request, env)) return J({ error: "Wrong password" }, 401);
  const b = await request.json();
  const type = String(b.type || "");
  const title = String(b.title || "").trim().slice(0, 60);
  const details = String(b.details || "").trim().slice(0, 600);
  const sort = parseInt(b.sort, 10) || 0;
  const active = b.active ? 1 : 0;
  if (!TYPES.includes(type)) return J({ error: "Choose a type" }, 400);
  if (!title) return J({ error: "Enter a title" }, 400);

  if (b.id) {
    await env.DB.prepare("UPDATE pay_methods SET type=?,title=?,details=?,sort=?,active=? WHERE id=?")
      .bind(type, title, details, sort, active, b.id).run();
    return J({ ok: true, id: b.id });
  }

  const c = await env.DB.prepare("SELECT COUNT(*) AS n FROM pay_methods").first();
  if (c && c.n >= MAX_METHODS) return J({ error: "Up to " + MAX_METHODS + " methods. Delete one first." }, 400);
  const r = await env.DB.prepare(
    "INSERT INTO pay_methods (type,title,details,sort,active) VALUES (?,?,?,?,?)"
  ).bind(type, title, details, sort, active).run();
  return J({ ok: true, id: r.meta.last_row_id });
});

export const onRequestDelete = safe(async ({ request, env }) => {
  if (!ok(request, env)) return J({ error: "Wrong password" }, 401);
  const id = new URL(request.url).searchParams.get("id");
  await env.DB.prepare("DELETE FROM pay_methods WHERE id=?").bind(id).run();
  return J({ ok: true });
});
