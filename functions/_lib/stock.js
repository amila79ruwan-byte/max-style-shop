// Stock for orders, including stock per size / colour.
// A product can have rows in product_variants (one row per size + colour). When it has, those rows are the real stock
// and products.stock always holds their total (so lists and stats keep working). A product with no rows keeps one plain
// number in products.stock (NULL = not tracked). The table is created by itself the first time it is needed.
let ready = false;
export async function ensureVariants(env) {
  if (ready) return;
  await env.DB.batch([
    env.DB.prepare("CREATE TABLE IF NOT EXISTS product_variants (id INTEGER PRIMARY KEY AUTOINCREMENT, product_id INTEGER NOT NULL, size TEXT NOT NULL DEFAULT '', color TEXT NOT NULL DEFAULT '', stock INTEGER NOT NULL DEFAULT 0, UNIQUE(product_id,size,color))"),
    env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_variants_product ON product_variants(product_id)")
  ]);
  ready = true;
}
const label = (size, color) => { const t = [size, color].filter(Boolean).join(", "); return t ? " (" + t + ")" : ""; };
const changed = r => !!(r && r.meta && r.meta.changes > 0);

// lines: [{ id | name, size, color, qty }]. Takes the stock out, one safe UPDATE per size/colour (it only works when enough
// is left, so two orders at the same moment can never take the same last piece). Returns { ok:true, taken } or { ok:false, error }.
export async function reserveLines(env, lines) {
  await ensureVariants(env);
  const { results: prods } = await env.DB.prepare("SELECT id,name,stock FROM products").all();
  const { results: vrows } = await env.DB.prepare("SELECT DISTINCT product_id FROM product_variants").all();
  const hasV = new Set(vrows.map(r => r.product_id));
  const need = new Map();
  for (const l of lines) {
    const p = prods.find(x => (l.id ? x.id == l.id : x.name === l.name));
    const qty = Number(l.qty) || 0;
    if (!p || !qty) continue;
    const v = hasV.has(p.id), size = v ? String(l.size || "") : "", color = v ? String(l.color || "") : "";
    const k = p.id + "|" + size + "|" + color;
    const e = need.get(k) || { p, v, size, color, qty: 0 };
    e.qty += qty; need.set(k, e);
  }
  const taken = [];
  for (const e of need.values()) {
    const { p, v, size, color, qty } = e;
    if (!v) {
      if (p.stock === null || p.stock === undefined) continue;   // not tracked
      const r = await env.DB.prepare("UPDATE products SET stock=stock-? WHERE id=? AND stock IS NOT NULL AND stock>=?").bind(qty, p.id, qty).run();
      if (changed(r)) { taken.push({ id: p.id, size: "", color: "", qty, v: false }); continue; }
      await releaseTaken(env, taken);
      const now = await env.DB.prepare("SELECT stock FROM products WHERE id=?").bind(p.id).first();
      const left = now && now.stock !== null && now.stock !== undefined ? now.stock : 0;
      return { ok: false, error: left <= 0 ? p.name + " is sold out." : "Only " + left + " left of " + p.name + "." };
    }
    const r = await env.DB.prepare("UPDATE product_variants SET stock=stock-? WHERE product_id=? AND size=? AND color=? AND stock>=?").bind(qty, p.id, size, color, qty).run();
    if (changed(r)) {
      await env.DB.prepare("UPDATE products SET stock=MAX(COALESCE(stock,0)-?,0) WHERE id=?").bind(qty, p.id).run();
      taken.push({ id: p.id, size, color, qty, v: true });
      continue;
    }
    await releaseTaken(env, taken);
    const now = await env.DB.prepare("SELECT stock FROM product_variants WHERE product_id=? AND size=? AND color=?").bind(p.id, size, color).first();
    const left = now ? now.stock : 0;
    return { ok: false, error: left <= 0 ? p.name + label(size, color) + " is sold out." : "Only " + left + " left of " + p.name + label(size, color) + "." };
  }
  return { ok: true, taken };
}

// Puts back what reserveLines took (used when the order could not be saved).
export async function releaseTaken(env, taken) {
  if (!taken || !taken.length) return;
  const st = [];
  for (const t of taken) {
    if (t.v) {
      st.push(env.DB.prepare("UPDATE product_variants SET stock=stock+? WHERE product_id=? AND size=? AND color=?").bind(t.qty, t.id, t.size, t.color));
      st.push(env.DB.prepare("UPDATE products SET stock=COALESCE(stock,0)+? WHERE id=?").bind(t.qty, t.id));
    } else {
      st.push(env.DB.prepare("UPDATE products SET stock=stock+? WHERE id=? AND stock IS NOT NULL").bind(t.qty, t.id));
    }
  }
  await env.DB.batch(st);
}

// Puts the stock of finished-with order items back (cancelled, deleted, expired). items = the order's saved lines.
// A size / colour that no longer exists on the product is skipped, so the total never drifts away from the rows.
export async function restockItems(env, items) {
  if (!items || !items.length) return;
  await ensureVariants(env);
  const { results: prods } = await env.DB.prepare("SELECT id,name FROM products").all();
  const { results: vrows } = await env.DB.prepare("SELECT DISTINCT product_id FROM product_variants").all();
  const hasV = new Set(vrows.map(r => r.product_id));
  for (const it of items) {
    const p = prods.find(x => (it.id ? x.id == it.id : x.name === it.name));
    const qty = Number(it.qty) || 0;
    if (!p || !qty) continue;
    if (hasV.has(p.id)) {
      const r = await env.DB.prepare("UPDATE product_variants SET stock=stock+? WHERE product_id=? AND size=? AND color=?").bind(qty, p.id, String(it.size || ""), String(it.color || "")).run();
      if (changed(r)) await env.DB.prepare("UPDATE products SET stock=COALESCE(stock,0)+? WHERE id=?").bind(qty, p.id).run();
    } else {
      await env.DB.prepare("UPDATE products SET stock=stock+? WHERE id=? AND stock IS NOT NULL").bind(qty, p.id).run();
    }
  }
}
