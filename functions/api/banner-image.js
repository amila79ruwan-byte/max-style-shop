import { serveImage } from "../_lib/serve.js";
// Public: GET /api/banner-image?id=BANNER_ID&v=VERSION -> the banner image bytes.
// "v" changes when the photo is replaced, so the browser / edge cache is never stale.
export async function onRequestGet(ctx) {
  const { request, env } = ctx;
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  return serveImage(ctx, async () => {
    const r = await env.DB.prepare("SELECT image FROM banners WHERE id=?").bind(id).first();
    return r && r.image;
  }, url.searchParams.has("v"));
}
