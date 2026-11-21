import { serveImage } from "../_lib/serve.js";
// Public: GET /api/image?id=PRODUCT_ID&v=VERSION -> the product's main picture
export async function onRequestGet(ctx) {
  const { request, env } = ctx;
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  return serveImage(ctx, async () => {
    const r = await env.DB.prepare("SELECT image FROM products WHERE id=?").bind(id).first();
    return r && r.image;
  }, url.searchParams.has("v"));   // v changes whenever the product is edited, so the cached copy is never stale
}
