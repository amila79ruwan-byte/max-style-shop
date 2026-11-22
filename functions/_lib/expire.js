// Auto-cancel unpaid bank / online orders. Cloudflare Pages has no scheduled jobs, so this runs by itself
// whenever someone loads the products, places an order, checks an order or opens the admin orders list
// (at most once a minute per server instance).
// An order is cancelled when: it is a bank / online order, still waiting for the slip (pay_state = awaiting),
// the admin has not moved it past "received", and SLIP_HOURS have passed. Its stock goes back.
// Cash-on-delivery orders still at "received" after COD_HOURS are cancelled the same way.
// If the admin confirms the order (status confirmed or later) before the time is up, it is never cancelled.
export const SLIP_HOURS = 24;   // payment slip must arrive within this time
export const COD_HOURS = 72;    // cash-on-delivery order not confirmed by the admin within this time is cancelled (stock freed). 0 = never
// (A fake COD order could otherwise lock stock forever.)
import { sendTelegram } from "./notify.js";
const codeOf = id => "MS-" + (1000 + Number(id));
const REMIND_BEFORE_HOURS = 24;   // Telegram reminder this many hours before a COD order would be auto-cancelled
let lastRun = 0;

export async function expireUnpaid(env) {
  const now = Date.now();
  if (now - lastRun < 60000) return;
  lastRun = now;
  try {
    const { results } = await env.DB.prepare(
      "SELECT id,items,name,phone1,payment FROM orders WHERE status='received' AND ((pay_state='awaiting' AND created<?) OR (?>0 AND payment='cod' AND created<?)) LIMIT 50"
    ).bind(now - SLIP_HOURS * 3600000, COD_HOURS, now - COD_HOURS * 3600000).all();
    const cancelled = [];
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
      cancelled.push(o);
    }
    if (cancelled.length) {
      await sendTelegram(env, "Auto-cancelled (not confirmed / paid in time), stock put back:\n" +
        cancelled.map(o => "- " + codeOf(o.id) + " " + o.name + " " + o.phone1 + " (" + (o.payment === "cod" ? "COD" : o.payment) + ")").join("\n"));
    }
    // Reminder: COD orders still waiting for the owner, about to be auto-cancelled. Sent once per order.
    if (COD_HOURS > 0) {
      const remindAfter = Math.max(COD_HOURS - REMIND_BEFORE_HOURS, 1);
      const { results: due } = await env.DB.prepare(
        "SELECT id,name,phone1,created FROM orders WHERE status='received' AND payment='cod' AND created<? ORDER BY id LIMIT 20"
      ).bind(now - remindAfter * 3600000).all();
      const fresh = [];
      for (const o of due) {
        // INSERT ... DO NOTHING is atomic: only the request that really inserts the marker sends the reminder.
        const m = await env.DB.prepare("INSERT INTO login_attempts (k,n,locked_until,updated) VALUES (?,1,0,?) ON CONFLICT(k) DO NOTHING")
          .bind("remind:" + o.id + ":" + o.created, now).run();
        if (m.meta && m.meta.changes > 0) fresh.push(o);
      }
      if (fresh.length) {
        await sendTelegram(env, "Confirm these COD orders soon, or they will be auto-cancelled:\n" +
          fresh.map(o => "- " + codeOf(o.id) + " " + o.name + " " + o.phone1 + " (~" + Math.max(Math.round(COD_HOURS - (now - o.created) / 3600000), 0) + "h left)").join("\n"));
      }
    }
  } catch (e) { /* never break the shop because of this clean-up */ }
}
