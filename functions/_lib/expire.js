// Auto-cancel unpaid bank / online orders. Cloudflare Pages has no scheduled jobs, so this runs by itself
// whenever someone loads the products, places an order, checks an order or opens the admin orders list
// (at most once a minute per server instance).
// An order is cancelled when: it is a bank / online order, still waiting for the slip (pay_state = awaiting),
// the admin has not moved it past "received", and SLIP_HOURS have passed. Its stock goes back.
// If the admin confirms the order (status confirmed or later) before the time is up, it is never cancelled.
export const SLIP_HOURS = 24;   // payment slip must arrive within this time
let lastRun = 0;

export async function expireUnpaid(env) {
  const now = Date.now();
  if (now - lastRun < 60000) return;
  lastRun = now;
  try {
    const { results } = await env.DB.prepare(
      "SELECT id,items FROM orders WHERE status='received' AND pay_state='awaiting' AND created<? LIMIT 50"
    ).bind(now - SLIP_HOURS * 3600000).all();
    for (const o of results) {
      // Only the request that really changes the status puts the stock back (no double restock).
      const r = await env.DB.prepare("UPDATE orders SET status='cancelled' WHERE id=? AND status='received'").bind(o.id).run();
      if (!(r.meta && r.meta.changes > 0)) continue;
      let items = [];
      try { items = JSON.parse(o.items || "[]"); } catch (e) {}
      const st = [];
      for (const it of items) {
        const q = Number(it.qty) || 0;
        if (!q) continue;
        st.push(it.id
          ? env.DB.prepare("UPDATE products SET stock=stock+? WHERE id=? AND stock IS NOT NULL").bind(q, it.id)
          : env.DB.prepare("UPDATE products SET stock=stock+? WHERE name=? AND stock IS NOT NULL").bind(q, it.name));
      }
      if (st.length) await env.DB.batch(st);
    }
  } catch (e) { /* never break the shop because of this clean-up */ }
}
