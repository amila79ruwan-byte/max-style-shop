import { serveImage } from "../_lib/serve.js";
// Public: GET /api/circle-image?key=bags&v=VERSION -> the circle photo bytes ("v" changes when the photo is replaced).
export async function onRequestGet(ctx) {
  const { request, env } = ctx;
  const url = new URL(request.url);
  const key = url.searchParams.get("key");
  return serveImage(ctx, async () => {
    const r = await env.DB.prepare("SELECT image FROM circle_photos WHERE k=?").bind(key).first();
    return r && r.image;
  }, url.searchParams.has("v"));
}
