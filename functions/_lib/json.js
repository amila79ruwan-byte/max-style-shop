// Reads the request body as a JSON object. Returns null when the body is missing, broken or not an object,
// so the API can answer 400 "Bad request" instead of crashing with a 500.
export async function readJson(request) {
  try {
    const b = await request.json();
    return b && typeof b === "object" && !Array.isArray(b) ? b : null;
  } catch (e) { return null; }
}
