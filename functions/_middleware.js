// Admin password guard for every /api route. If a request carries an x-admin-password header,
// wrong passwords are counted per IP address. After ADMIN_MAX_FAILS wrong passwords the IP is locked
// for 15 minutes (even the right password is refused during the lock). Requests with no password
// header (normal customers) are never counted. Uses the login_attempts table made earlier.
const ADMIN_MAX_FAILS = 10;
const LOCK_MS = 15 * 60 * 1000;
const FORGET_MS = 60 * 60 * 1000;

export async function onRequest({ request, env, next }) {
  const given = request.headers.get("x-admin-password");
  if (!given || !env.ADMIN_PASSWORD || !env.DB) return next();
  try {
    const k = "adminall:" + (request.headers.get("cf-connecting-ip") || "unknown");
    const now = Date.now();
    const row = await env.DB.prepare("SELECT n,locked_until,updated FROM login_attempts WHERE k=?").bind(k).first();
    if (row && row.locked_until > now) {
      const mins = Math.max(1, Math.ceil((row.locked_until - now) / 60000));
      return new Response(JSON.stringify({ error: "Too many wrong attempts. Try again in " + mins + " minutes." }),
        { status: 429, headers: { "content-type": "application/json" } });
    }
    if (given === env.ADMIN_PASSWORD) {
      if (row && row.n > 0) await env.DB.prepare("DELETE FROM login_attempts WHERE k=?").bind(k).run();
    } else {
      let n = row ? row.n : 0;
      if (row && ((row.locked_until && row.locked_until <= now) || now - row.updated > FORGET_MS)) n = 0;
      n++;
      await env.DB.prepare("INSERT INTO login_attempts (k,n,locked_until,updated) VALUES (?,?,?,?) ON CONFLICT(k) DO UPDATE SET n=excluded.n, locked_until=excluded.locked_until, updated=excluded.updated")
        .bind(k, n, n >= ADMIN_MAX_FAILS ? now + LOCK_MS : 0, now).run();
    }
  } catch (e) { /* if the counter fails, the shop keeps working (each endpoint still checks the password) */ }
  return next();
}
