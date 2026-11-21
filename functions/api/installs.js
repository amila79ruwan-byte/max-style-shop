import { hit } from "../_lib/ratelimit.js";
const J = (d, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { "content-type": "application/json" } });

export async function onRequestPost({ request, env }) {
  // Max 3 install counts per connection per day, so nobody can flood the table.
  const ip = request.headers.get("cf-connecting-ip") || "unknown";
  if (!(await hit(env, "inst:" + ip, 3, 24 * 3600000))) return J({ ok: true });   // silently ignored
  await env.DB.prepare("INSERT INTO installs (created) VALUES (?)").bind(Date.now()).run();
  return J({ ok: true });
}

export async function onRequestGet({ request, env }) {
  if (!env.ADMIN_PASSWORD || request.headers.get("x-admin-password") !== env.ADMIN_PASSWORD) return J({ error: "Wrong password" }, 401);
  const r = await env.DB.prepare("SELECT COUNT(*) AS n FROM installs").first();
  return J({ count: r.n });
}
