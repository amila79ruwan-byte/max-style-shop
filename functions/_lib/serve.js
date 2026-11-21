// Safe image serving, shared by /api/image, /api/photo and /api/banner-image.
// 1) Only png / jpeg / webp / gif are ever served. Anything else stored in the database (for example an SVG or HTML file
//    that was uploaded by mistake, which could run scripts on the shop's own address) answers 404 instead.
// 2) The finished image is kept in Cloudflare's edge cache, so the database is read once per image, not on every page view.
//    "cacheable" must only be true when the URL changes whenever the picture changes (products and banners have ?v=..., photos get a new id).
const OK_HEAD = /^data:(image\/(?:png|jpeg|webp|gif));base64,/i;

export async function serveImage(ctx, getDataUrl, cacheable) {
  const { request, waitUntil } = ctx;
  let cache = null;
  try { cache = cacheable && typeof caches !== "undefined" ? caches.default : null; } catch (e) {}
  if (cache) { try { const hit = await cache.match(request); if (hit) return hit; } catch (e) {} }

  const data = String((await getDataUrl()) || "");
  const m = data.match(OK_HEAD);
  if (!m) return new Response("", { status: 404 });
  let u;
  try {
    const bin = atob(data.slice(m[0].length));
    u = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
  } catch (e) { return new Response("", { status: 404 }); }

  const res = new Response(u, { headers: {
    "content-type": m[1].toLowerCase(),
    "cache-control": "public,max-age=31536000,immutable",
    "x-content-type-options": "nosniff",
    "content-security-policy": "default-src 'none'; sandbox"
  } });
  if (cache) { try { waitUntil(cache.put(request, res.clone())); } catch (e) {} }
  return res;
}
