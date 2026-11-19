// Customer accounts: sign up / sign in with phone + 4-digit PIN, profile, and order history.
const J = (d, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { "content-type": "application/json" } });
const enc = new TextEncoder();
const hex = b => [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, "0")).join("");
const normPhone = p => String(p || "").replace(/\D/g, "");
const newToken = () => hex(crypto.getRandomValues(new Uint8Array(24)));
async function hashPin(phone, pin) {
  return hex(await crypto.subtle.digest("SHA-256", enc.encode("maxstyle:" + phone + ":" + pin)));
}
async function me(env, tok) {
  if (!tok) return null;
  return await env.DB.prepare("SELECT id,phone,name,phone2,district,address FROM customers WHERE token=?").bind(tok).first();
}

// Order history: the customer's orders are matched by the last 9 digits of the phone number.
export async function onRequestGet({ request, env }) {
  const p = await me(env, new URL(request.url).searchParams.get("token") || "");
  if (!p) return J({ error: "Please sign in" }, 401);
  const { results } = await env.DB.prepare(
    "SELECT id,name,phone1,phone2,district,address,items,total,status,created FROM orders WHERE phone1 LIKE ? ORDER BY id DESC LIMIT 50"
  ).bind("%" + p.phone.slice(-9)).all();
  const orders = results.map(o => {
    let items = [];
    try { items = JSON.parse(o.items || "[]"); } catch (e) {}
    return { ...o, code: "MS-" + (1000 + o.id), items };
  });
  return J({ profile: p, orders });
}

export async function onRequestPost({ request, env }) {
  let b;
  try { b = await request.json(); } catch (e) { return J({ error: "Bad request" }, 400); }
  const act = b.action;

  if (act === "signup" || act === "login") {
    const phone = normPhone(b.phone), pin = String(b.pin || "");
    if (phone.length < 9) return J({ error: "Enter a valid phone number" }, 400);
    if (!/^\d{4}$/.test(pin)) return J({ error: "PIN must be 4 digits" }, 400);
    const ph = await hashPin(phone, pin);
    const row = await env.DB.prepare("SELECT id,pin_hash FROM customers WHERE phone=?").bind(phone).first();
    const tok = newToken();
    if (act === "signup") {
      if (row) return J({ error: "This phone number already has an account. Please sign in." }, 409);
      const name = String(b.name || "").trim();
      if (!name) return J({ error: "Enter your name" }, 400);
      await env.DB.prepare(
        "INSERT INTO customers (phone,name,phone2,district,address,pin_hash,token,created) VALUES (?,?,?,?,?,?,?,?)"
      ).bind(phone, name, normPhone(b.phone2) || null, String(b.district || ""), String(b.address || ""), ph, tok, Date.now()).run();
    } else {
      if (!row || row.pin_hash !== ph) return J({ error: "Wrong phone number or PIN" }, 401);
      await env.DB.prepare("UPDATE customers SET token=? WHERE id=?").bind(tok, row.id).run();
    }
    return J({ ok: true, token: tok });
  }

  // Everything below needs a valid token.
  const p = await me(env, b.token);
  if (!p) return J({ error: "Please sign in" }, 401);

  if (act === "update") {
    const name = String(b.name || "").trim();
    if (!name) return J({ error: "Enter your name" }, 400);
    await env.DB.prepare("UPDATE customers SET name=?,phone2=?,district=?,address=? WHERE id=?")
      .bind(name, normPhone(b.phone2) || null, String(b.district || ""), String(b.address || ""), p.id).run();
    return J({ ok: true });
  }

  if (act === "pin") {
    const row = await env.DB.prepare("SELECT pin_hash FROM customers WHERE id=?").bind(p.id).first();
    if (!row || row.pin_hash !== await hashPin(p.phone, String(b.old_pin || ""))) return J({ error: "Current PIN is wrong" }, 401);
    const np = String(b.new_pin || "");
    if (!/^\d{4}$/.test(np)) return J({ error: "New PIN must be 4 digits" }, 400);
    await env.DB.prepare("UPDATE customers SET pin_hash=? WHERE id=?").bind(await hashPin(p.phone, np), p.id).run();
    return J({ ok: true });
  }

  if (act === "logout") {
    await env.DB.prepare("UPDATE customers SET token=NULL WHERE id=?").bind(p.id).run();
    return J({ ok: true });
  }

  return J({ error: "Unknown action" }, 400);
}
