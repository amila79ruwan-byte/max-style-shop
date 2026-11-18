export async function onRequestGet({ request, env }) {
  const id = new URL(request.url).searchParams.get("id");
  const r = await env.DB.prepare("SELECT image FROM products WHERE id=?").bind(id).first();
  if (!r || !r.image) return new Response("", { status: 404 });
  const [head, data] = r.image.split(",");
  const type = head.match(/data:(.*);base64/)[1];
  const bin = atob(data);
  const u = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
  return new Response(u, { headers: { "content-type": type, "cache-control": "public,max-age=31536000,immutable" } });
}
