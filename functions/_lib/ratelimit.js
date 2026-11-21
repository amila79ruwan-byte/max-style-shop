// Small shared rate limiter. Uses the existing login_attempts table (no new table / no migration needed).
// hit(env, key, max, windowMs) -> true = allowed, false = too many.
// The window starts at the first hit and ends windowMs later. If the counter itself fails, the request is allowed
// (a broken limiter must never stop real customers).
export async function hit(env, key, max, windowMs) {
  try {
    const now = Date.now();
    const row = await env.DB.prepare("SELECT n,updated FROM login_attempts WHERE k=?").bind(key).first();
    const fresh = !!(row && now - row.updated < windowMs);
    const n = fresh ? row.n : 0;
    if (n >= max) return false;
    const start = fresh ? row.updated : now;
    await env.DB.prepare(
      "INSERT INTO login_attempts (k,n,locked_until,updated) VALUES (?,?,0,?) ON CONFLICT(k) DO UPDATE SET n=?, updated=?"
    ).bind(key, n + 1, start, n + 1, start).run();
    return true;
  } catch (e) { return true; }
}
