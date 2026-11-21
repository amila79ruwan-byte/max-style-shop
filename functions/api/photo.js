import { serveImage } from "../_lib/serve.js";
// Public: GET /api/photo?id=PHOTO_ID -> the image bytes (a photo id never changes its picture, so it is always cacheable)
export async function onRequestGet(ctx) {
  const { request, env } = ctx;
  const id = new URL(request.url).searchParams.get("id");
  return serveImage(ctx, async () => {
    const r = await env.DB.prepare("SELECT image FROM product_photos WHERE id=?").bind(id).first();
    return r && r.image;
  }, true);
}
