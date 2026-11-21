// Public: GET /api/banner-image?id=BANNER_ID&v=VERSION -> the banner image bytes.
// The banner list (/api/banners) only gives this URL, so the list stays small and the browser caches each photo.
// "v" changes when the photo is replaced, so the cache is never stale.
export async function onRequestGet({ request, env }) {
  const id = new URL(request.url).searchParams.get("id");
  const r = await env.DB.prepare("SELECT image FROM banners WHERE id=?").bind(id).first();
  const m = r && r.image && String(r.image).match(/^data:(image\/[a-z0-9.+-]+);base64,(.+)$/i);
  if (!m) return new Response("", { status: 404 });
  const bin = atob(m[2]);
  const u = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
  return new Response(u, { headers: { "content-type": m[1], "cache-control": "public,max-age=31536000,immutable" } });
}
