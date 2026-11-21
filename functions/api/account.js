// Customer accounts: sign up / sign in with phone + 4-digit PIN, profile, saved addresses, and order history.
const J = (d, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { "content-type": "application/json" } });
const enc = new TextEncoder();
const hex = b => [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, "0")).join("");
const normPhone = p => String(p || "").replace(/\D/g, "");
const newToken = () => hex(crypto.getRandomValues(new Uint8Array(24)));
const DISTRICTS = ["Colombo","Gampaha","Kalutara","Kandy","Matale","Nuwara Eliya","Galle","Matara","Hambantota","Jaffna","Kilinochchi","Mannar","Vavuniya","Mullaitivu","Batticaloa","Ampara","Trincomalee","Kurunegala","Puttalam","Anuradhapura","Polonnaruwa","Badulla","Monaragala","Ratnapura","Kegalle"];
const MAX_ADDR = 10;
async function hashPin(phone, pin) {
  return hex(await crypto.subtle.digest("SHA-256", enc.encode("maxstyle:" + phone + ":" + pin)));
}
// ---- Login rate limit: stops PIN guessing. Counters live in the login_attempts table (see migrate_login_attempts.sql). ----
const PHONE_MAX_FAILS = 5;     // wrong PINs allowed for one phone number
const IP_MAX_FAILS = 20;       // wrong attempts allowed from one IP address
const LOCK_MS = 15 * 60 * 1000; // lock time: 15 minutes
const FORGET_MS = 60 * 60 * 1000; // old failed attempts are forgotten after 1 hour
const clientIp = req => req.headers.get("cf-connecting-ip") || "unknown";
const tooMany = until => J({ error: "Too many wrong attempts. Try again in " + Math.max(1, Math.ceil((until - Date.now()) / 60000)) + " minutes." }, 429);

// Returns the time (ms) until which any of these keys is locked, or 0 if none.
async function lockedUntil(env, keys) {
  const now = Date.now();
  let until = 0;
  for (const k of keys) {
    const r = await env.DB.prepare("SELECT locked_until FROM login_attempts WHERE k=?").bind(k).first();
    if (r && r.locked_until > now && r.locked_until > until) until = r.locked_until;
  }
  return until;
}
async function addFail(env, k, max) {
  const now = Date.now();
  const r = await env.DB.prepare("SELECT n,locked_until,updated FROM login_attempts WHERE k=?").bind(k).first();
  let n = r ? r.n : 0;
  if (r && ((r.locked_until && r.locked_until <= now) || now - r.updated > FORGET_MS)) n = 0;   // lock ended or very old: start again
  n++;
  await env.DB.prepare("INSERT INTO login_attempts (k,n,locked_until,updated) VALUES (?,?,?,?) ON CONFLICT(k) DO UPDATE SET n=excluded.n, locked_until=excluded.locked_until, updated=excluded.updated")
    .bind(k, n, n >= max ? now + LOCK_MS : 0, now).run();
}
async function clearFails(env, k) {
  await env.DB.prepare("DELETE FROM login_attempts WHERE k=?").bind(k).run();
}

// Login lasts 30 days. Every time the customer uses the site, the time is extended again
// (when less than half is left), so someone who keeps using the shop stays signed in.
const TOKEN_MS = 30 * 24 * 3600 * 1000;
async function me(env, tok) {
  if (!tok) return null;
  const row = await env.DB.prepare("SELECT id,phone,name,phone2,district,address,token_exp FROM customers WHERE token=?").bind(tok).first();
  if (!row) return null;
  const now = Date.now(), exp = row.token_exp || 0;
  delete row.token_exp;
  if (exp && exp < now) return null;                         // expired: the customer must sign in again
  if (!exp || exp - now < TOKEN_MS / 2) {
    await env.DB.prepare("UPDATE customers SET token_exp=? WHERE id=?").bind(now + TOKEN_MS, row.id).run();
  }
  return row;
}

// Saved addresses of one customer (default first).
async function addressesOf(env, cid) {
  const { results } = await env.DB.prepare(
    "SELECT id,name,phone,phone2,district,city,postal,address,is_default FROM addresses WHERE customer_id=? ORDER BY is_default DESC, id DESC"
  ).bind(cid).all();
  return results;
}

// Order history: the customer's orders are matched by the last 9 digits of the phone number.
export async function onRequestGet({ request, env }) {
  const p = await me(env, new URL(request.url).searchParams.get("token") || "");
  if (!p) return J({ error: "Please sign in" }, 401);
  let addrs = await addressesOf(env, p.id);
  // First time: turn the old single address (if any) into the first saved address, as the default.
  if (!addrs.length && p.address && p.district) {
    await env.DB.prepare(
      "INSERT INTO addresses (customer_id,name,phone,phone2,district,city,postal,address,is_default,created) VALUES (?,?,?,?,?,?,?,?,1,?)"
    ).bind(p.id, p.name, p.phone, p.phone2 || "", p.district, "", "", p.address, Date.now()).run();
    addrs = await addressesOf(env, p.id);
  }
  const { results } = await env.DB.prepare(
    "SELECT id,name,phone1,phone2,district,address,items,total,status,created FROM orders WHERE phone1 LIKE ? ORDER BY id DESC LIMIT 50"
  ).bind("%" + p.phone.slice(-9)).all();
  const orders = results.map(o => {
    let items = [];
    try { items = JSON.parse(o.items || "[]"); } catch (e) {}
    return { ...o, code: "MS-" + (1000 + o.id), items };
  });
  return J({ profile: p, orders, addresses: addrs });
}

export async function onRequestPost({ request, env }) {
  let b;
  try { b = await request.json(); } catch (e) { return J({ error: "Bad request" }, 400); }
  const act = b.action;

  // Admin: reset a customer's PIN (used from the PIN reset page).
  if (act === "adminReset") {
    const aKey = "admin:" + clientIp(request);
    const aLock = await lockedUntil(env, [aKey]);
    if (aLock) return tooMany(aLock);
    if (!env.ADMIN_PASSWORD || request.headers.get("x-admin-password") !== env.ADMIN_PASSWORD) {
      await addFail(env, aKey, PHONE_MAX_FAILS);
      return J({ error: "Wrong password" }, 401);
    }
    await clearFails(env, aKey);
    const phone = normPhone(b.phone), pin = String(b.new_pin || "");
    if (phone.length < 9) return J({ error: "Enter a valid phone number" }, 400);
    if (!/^\d{4}$/.test(pin)) return J({ error: "New PIN must be 4 digits" }, 400);
    const row = await env.DB.prepare("SELECT id FROM customers WHERE phone=?").bind(phone).first();
    if (!row) return J({ error: "No account with this phone number" }, 404);
    await env.DB.prepare("UPDATE customers SET pin_hash=?, token=NULL WHERE id=?").bind(await hashPin(phone, pin), row.id).run();
    return J({ ok: true });
  }

  if (act === "signup" || act === "login") {
    const phone = normPhone(b.phone), pin = String(b.pin || "");
    if (phone.length < 9) return J({ error: "Enter a valid phone number" }, 400);
    if (!/^\d{4}$/.test(pin)) return J({ error: "PIN must be 4 digits" }, 400);
    const ph = await hashPin(phone, pin);
    const pKey = "phone:" + phone, iKey = "ip:" + clientIp(request);
    if (act === "login") {
      const lock = await lockedUntil(env, [pKey, iKey]);
      if (lock) return tooMany(lock);
    }
    const row = await env.DB.prepare("SELECT id,pin_hash FROM customers WHERE phone=?").bind(phone).first();
    const tok = newToken();
    if (act === "signup") {
      if (row) return J({ error: "This phone number already has an account. Please sign in." }, 409);
      const name = String(b.name || "").trim();
      if (!name) return J({ error: "Enter your name" }, 400);
      await env.DB.prepare(
        "INSERT INTO customers (phone,name,phone2,district,address,pin_hash,token,token_exp,created) VALUES (?,?,?,?,?,?,?,?,?)"
      ).bind(phone, name, normPhone(b.phone2) || null, String(b.district || ""), String(b.address || ""), ph, tok, Date.now() + TOKEN_MS, Date.now()).run();
    } else {
      if (!row || row.pin_hash !== ph) {
        await addFail(env, pKey, PHONE_MAX_FAILS);
        await addFail(env, iKey, IP_MAX_FAILS);
        return J({ error: "Wrong phone number or PIN" }, 401);
      }
      await clearFails(env, pKey);
      await env.DB.prepare("UPDATE customers SET token=?, token_exp=? WHERE id=?").bind(tok, Date.now() + TOKEN_MS, row.id).run();
    }
    return J({ ok: true, token: tok });
  }

  // Everything below needs a valid token.
  const p = await me(env, b.token);
  if (!p) return J({ error: "Please sign in" }, 401);

  // Customer confirms they received an order that is packed or out for delivery.
  if (act === "confirm") {
    const id = parseInt(String(b.code || "").replace(/\D/g, ""), 10) - 1000;
    const o = await env.DB.prepare("SELECT id,status FROM orders WHERE id=? AND phone1 LIKE ?")
      .bind(id, "%" + p.phone.slice(-9)).first();
    if (!o) return J({ error: "Order not found" }, 404);
    if (!["packed", "out"].includes(o.status)) return J({ error: "This order cannot be confirmed now" }, 400);
    await env.DB.prepare("UPDATE orders SET status='delivered' WHERE id=?").bind(id).run();
    return J({ ok: true });
  }

  if (act === "update") {
    const name = String(b.name || "").trim();
    if (!name) return J({ error: "Enter your name" }, 400);
    await env.DB.prepare("UPDATE customers SET name=?,phone2=?,district=?,address=? WHERE id=?")
      .bind(name, normPhone(b.phone2) || null, String(b.district || ""), String(b.address || ""), p.id).run();
    return J({ ok: true });
  }

  // Saved addresses: add a new one, or edit one (when b.id is given).
  if (act === "addrSave") {
    const name = String(b.name || "").trim().slice(0, 100);
    const phone = normPhone(b.phone), phone2 = normPhone(b.phone2);
    const district = String(b.district || "").trim();
    const city = String(b.city || "").trim().slice(0, 80);
    const postal = String(b.postal || "").trim().slice(0, 10);
    const address = String(b.address || "").trim().slice(0, 500);
    if (!name) return J({ error: "Enter the name" }, 400);
    if (phone.length < 9) return J({ error: "Enter a valid phone number" }, 400);
    if (phone2 && phone2.length < 9) return J({ error: "Enter a valid second phone number" }, 400);
    if (!DISTRICTS.includes(district)) return J({ error: "Select a district" }, 400);
    if (!city) return J({ error: "Select a city" }, 400);
    if (!address) return J({ error: "Enter the address" }, 400);

    const id = Number(b.id) || 0;
    if (id) {
      const own = await env.DB.prepare("SELECT id FROM addresses WHERE id=? AND customer_id=?").bind(id, p.id).first();
      if (!own) return J({ error: "Address not found" }, 404);
      await env.DB.prepare("UPDATE addresses SET name=?,phone=?,phone2=?,district=?,city=?,postal=?,address=? WHERE id=?")
        .bind(name, phone, phone2, district, city, postal, address, id).run();
      if (b.makeDefault) {
        await env.DB.prepare("UPDATE addresses SET is_default=CASE WHEN id=? THEN 1 ELSE 0 END WHERE customer_id=?").bind(id, p.id).run();
      }
      return J({ ok: true, id });
    }

    const cnt = await env.DB.prepare("SELECT COUNT(*) AS n FROM addresses WHERE customer_id=?").bind(p.id).first();
    if (cnt && cnt.n >= MAX_ADDR) return J({ error: "You can save up to " + MAX_ADDR + " addresses" }, 400);
    const first = !cnt || cnt.n === 0;
    const r = await env.DB.prepare(
      "INSERT INTO addresses (customer_id,name,phone,phone2,district,city,postal,address,is_default,created) VALUES (?,?,?,?,?,?,?,?,?,?)"
    ).bind(p.id, name, phone, phone2, district, city, postal, address, first ? 1 : 0, Date.now()).run();
    const newId = r.meta.last_row_id;
    if (!first && b.makeDefault) {
      await env.DB.prepare("UPDATE addresses SET is_default=CASE WHEN id=? THEN 1 ELSE 0 END WHERE customer_id=?").bind(newId, p.id).run();
    }
    return J({ ok: true, id: newId });
  }

  // Make one saved address the default (it fills the checkout form).
  if (act === "addrDefault") {
    const id = Number(b.id) || 0;
    const own = await env.DB.prepare("SELECT id FROM addresses WHERE id=? AND customer_id=?").bind(id, p.id).first();
    if (!own) return J({ error: "Address not found" }, 404);
    await env.DB.prepare("UPDATE addresses SET is_default=CASE WHEN id=? THEN 1 ELSE 0 END WHERE customer_id=?").bind(id, p.id).run();
    return J({ ok: true });
  }

  // Delete one saved address. If it was the default, the newest remaining address becomes the default.
  if (act === "addrDelete") {
    const id = Number(b.id) || 0;
    const own = await env.DB.prepare("SELECT id,is_default FROM addresses WHERE id=? AND customer_id=?").bind(id, p.id).first();
    if (!own) return J({ error: "Address not found" }, 404);
    await env.DB.prepare("DELETE FROM addresses WHERE id=?").bind(id).run();
    if (own.is_default) {
      const next = await env.DB.prepare("SELECT id FROM addresses WHERE customer_id=? ORDER BY id DESC LIMIT 1").bind(p.id).first();
      if (next) await env.DB.prepare("UPDATE addresses SET is_default=1 WHERE id=?").bind(next.id).run();
    }
    return J({ ok: true });
  }

  if (act === "pin") {
    const pKey = "phone:" + p.phone;
    const lock = await lockedUntil(env, [pKey]);
    if (lock) return tooMany(lock);
    const row = await env.DB.prepare("SELECT pin_hash FROM customers WHERE id=?").bind(p.id).first();
    if (!row || row.pin_hash !== await hashPin(p.phone, String(b.old_pin || ""))) {
      await addFail(env, pKey, PHONE_MAX_FAILS);
      return J({ error: "Current PIN is wrong" }, 401);
    }
    await clearFails(env, pKey);
    const np = String(b.new_pin || "");
    if (!/^\d{4}$/.test(np)) return J({ error: "New PIN must be 4 digits" }, 400);
    await env.DB.prepare("UPDATE customers SET pin_hash=? WHERE id=?").bind(await hashPin(p.phone, np), p.id).run();
    return J({ ok: true });
  }

  // Delete the account (needs the PIN). Saved addresses are deleted too. Orders are kept, so a new account
  // made later does not get the first order discount again.
  if (act === "deleteAccount") {
    const pKey = "phone:" + p.phone;
    const lock = await lockedUntil(env, [pKey]);
    if (lock) return tooMany(lock);
    const row = await env.DB.prepare("SELECT pin_hash FROM customers WHERE id=?").bind(p.id).first();
    if (!row || row.pin_hash !== await hashPin(p.phone, String(b.pin || ""))) {
      await addFail(env, pKey, PHONE_MAX_FAILS);
      return J({ error: "PIN is wrong" }, 401);
    }
    await clearFails(env, pKey);
    await env.DB.batch([
      env.DB.prepare("DELETE FROM addresses WHERE customer_id=?").bind(p.id),
      env.DB.prepare("DELETE FROM customers WHERE id=?").bind(p.id)
    ]);
    return J({ ok: true });
  }

  if (act === "logout") {
    await env.DB.prepare("UPDATE customers SET token=NULL WHERE id=?").bind(p.id).run();
    return J({ ok: true });
  }

  return J({ error: "Unknown action" }, 400);
}
