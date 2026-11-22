import { serveImage } from "../_lib/serve.js";
// Public: GET /api/photo?id=PHOTO_ID -> the extra product photo's image bytes.
// (The list of photos for a product is /api/photos?product=ID, in photos.js.)
// A photo gets a new id whenever it is added, so the edge cache is never stale.
export async function onRequestGet(ctx) {
  const { request, env } = ctx;
  const id = new URL(request.url).searchParams.get("id");
  return serveImage(ctx, async () => {
    const r = await env.DB.prepare("SELECT image FROM product_photos WHERE id=?").bind(id).first();
    return r && r.image;
  }, true);
}
