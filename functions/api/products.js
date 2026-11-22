import { readJson } from "../_lib/json.js";
import { expireUnpaid } from "../_lib/expire.js";
import { ensureVariants } from "../_lib/stock.js";
const J = (d, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { "content-type": "application/json" } });
const ok = (r, e) => e.ADMIN_PASSWORD && r.headers.get("x-admin-password") === e.ADMIN_PASSWORD;
const normList = v => (Array.isArray(v) ? v : String(v || "").split(",")).map(s => String(s).trim()).filter(Boolean).join(",");
const CATS = ["women", "men", "kids", "bedsheets", "towels", "pillows", "phone", "toys", "electric", "umbrella", "bags", "school"];
export async function onRequestGet({ env }) {
  await expireUnpaid(env);   // unpaid bank / online orders past the deadline are cancelled and their stock freed
  const cols = "id,name,price,cat,sizes,colors,description,size_chart,stock,feat_order,(image IS NOT NULL AND image<>'') AS has_image,updated";
  let results;
  try {
    ({ results } = await env.DB.prepare("SELECT " + cols + ",offer,old_price FROM products ORDER BY id DESC").all());
  } catch (e) {
    // old_price column not added yet (migrate_old_price.sql not run): the shop keeps working without it.
    try {
      ({ results } = await env.DB.prepare("SELECT " + cols + ",offer FROM products ORDER BY id DESC").all());
    } catch (e2) {
      ({ results } = await env.DB.prepare("SELECT " + cols + " FROM products ORDER BY id DESC").all());
    }
  }
  // Stock per size / colour (only products that have it get a "variants" list: [{s: size, c: colour, n: how many}]).
  const vmap = {};
  try {
    await ensureVariants(env);
    const { results: vr } = await env.DB.prepare("SELECT product_id,size,color,stock FROM product_variants ORDER BY id").all();
    for (const r of vr) (vmap[r.product_id] || (vmap[r.product_id] = [])).push({ s: r.size, c: r.color, n: r.stock });
  } catch (e) { /* variants could not be read: the shop keeps working with the plain stock number */ }
  return J(results.map(p => (vmap[p.id] ? { ...p, variants: vmap[p.id] } : p)));
}

export async function onRequestPost({ request, env }) {
  if (!ok(request, env)) return J({ error: "Wrong password" }, 401);
  const b = await readJson(request);
  if (!b) return J({ error: "Bad request" }, 400);
  if (b.check) return J({ ok: true });
  const name = String(b.name || "").trim(), price = parseInt(b.price, 10), cat = b.cat;
  if (!name || !(price >= 0) || !CATS.includes(cat)) return J({ error: "Invalid data" }, 400);
  const now = Date.now();
  const sizes = normList(b.sizes), colors = normList(b.colors);
  const description = String(b.description || "").trim().slice(0, 2000);
  const sizeChart = String(b.size_chart || "").trim().slice(0, 2000);
  // Stock: empty = not tracked (NULL), a number = how many are left.
  const stock = (b.stock === "" || b.stock === null || b.stock === undefined) ? null : Math.max(0, parseInt(b.stock, 10) || 0);
  // Slider position: 1-15 = shown in the home page slider in that order, 0 = not shown.
  let feat = parseInt(b.feat_order, 10);
  if (!(feat >= 1 && feat <= 15)) feat = 0;
  // Offer: 1 = shown in the "Offers" menu of the shop, 0 = not.
  const offer = b.offer ? 1 : 0;
  let id = b.id;
  if (id) {
    try {
      await env.DB.prepare("UPDATE products SET name=?,price=?,cat=?,sizes=?,colors=?,description=?,size_chart=?,stock=?,feat_order=?,offer=?,updated=? WHERE id=?")
        .bind(name, price, cat, sizes, colors, description, sizeChart, stock, feat, offer, now, id).run();
    } catch (e) {   // offer column not added yet (migrate_offer.sql not run)
      await env.DB.prepare("UPDATE products SET name=?,price=?,cat=?,sizes=?,colors=?,description=?,size_chart=?,stock=?,feat_order=?,updated=? WHERE id=?")
        .bind(name, price, cat, sizes, colors, description, sizeChart, stock, feat, now, id).run();
    }
  } else {
    let r;
    try {
      r = await env.DB.prepare("INSERT INTO products (name,price,cat,sizes,colors,description,size_chart,stock,feat_order,offer,updated) VALUES (?,?,?,?,?,?,?,?,?,?,?)")
        .bind(name, price, cat, sizes, colors, description, sizeChart, stock, feat, offer, now).run();
    } catch (e) {   // offer column not added yet (migrate_offer.sql not run)
      r = await env.DB.prepare("INSERT INTO products (name,price,cat,sizes,colors,description,size_chart,stock,feat_order,updated) VALUES (?,?,?,?,?,?,?,?,?,?)")
        .bind(name, price, cat, sizes, colors, description, sizeChart, stock, feat, now).run();
    }
    id = r.meta.last_row_id;
  }
  // The same number can only belong to one product: remove it from any other product.
  if (feat > 0) await env.DB.prepare("UPDATE products SET feat_order=0 WHERE feat_order=? AND id<>?").bind(feat, id).run();
  if (b.image) await env.DB.prepare("UPDATE products SET image=? WHERE id=?").bind(b.image, id).run();
  // Old price (before the offer, shown crossed out). Only kept when it is higher than the real price; otherwise 0.
  // The real price in the "price" column is what customers pay: this number is for display only.
  let oldPrice = parseInt(b.old_price, 10);
  // Discount % typed in the admin (1-90): the old price is worked out from it, so the red -% tag always matches.
  const pct = parseInt(b.disc_pct, 10);
  if (pct >= 1 && pct <= 90) oldPrice = Math.round(price * 100 / (100 - pct));
  if (!(oldPrice > price)) oldPrice = 0;
  try { await env.DB.prepare("UPDATE products SET old_price=? WHERE id=?").bind(oldPrice, id).run(); } catch (e) { /* column not added yet */ }
  // Stock per size / colour: the admin sends the full list [{size,color,stock}], which replaces the old one.
  // An empty list switches the product back to one plain stock number. products.stock always becomes the total.
  if (Array.isArray(b.variants)) {
    const sizeList = sizes ? sizes.split(",") : [], colorList = colors ? colors.split(",").map(c => c.split(":")[0].trim()) : [];
    const seen = new Set(), rows = [];
    if (b.variants.length > 300) return J({ error: "Too many size / colour combinations (max 300)." }, 400);
    for (const v of b.variants) {
      const size = String(v && v.size || "").trim(), color = String(v && v.color || "").trim();
      if ((sizeList.length ? !sizeList.includes(size) : size) || (colorList.length ? !colorList.includes(color) : color)) continue;   // not a size / colour of this product
      const k = size + "|" + color;
      if (seen.has(k)) continue;
      seen.add(k);
      rows.push([size, color, Math.min(Math.max(parseInt(v.stock, 10) || 0, 0), 100000)]);
    }
    await ensureVariants(env);
    const st = [env.DB.prepare("DELETE FROM product_variants WHERE product_id=?").bind(id)];
    for (const r of rows) st.push(env.DB.prepare("INSERT INTO product_variants (product_id,size,color,stock) VALUES (?,?,?,?)").bind(id, r[0], r[1], r[2]));
    if (rows.length) st.push(env.DB.prepare("UPDATE products SET stock=? WHERE id=?").bind(rows.reduce((t, r) => t + r[2], 0), id));
    await env.DB.batch(st);
  }
  return J({ ok: true, id });
}

export async function onRequestDelete({ request, env }) {
  if (!ok(request, env)) return J({ error: "Wrong password" }, 401);
  const id = new URL(request.url).searchParams.get("id");
  await ensureVariants(env);
  await env.DB.batch([
    env.DB.prepare("DELETE FROM product_variants WHERE product_id=?").bind(id),
    env.DB.prepare("DELETE FROM product_photos WHERE product_id=?").bind(id),   // its extra photos go too
    env.DB.prepare("DELETE FROM products WHERE id=?").bind(id)
  ]);
  return J({ ok: true });
}
