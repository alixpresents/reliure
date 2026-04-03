const envOrigins = Deno.env.get("ALLOWED_ORIGINS");
const ALLOWED_ORIGINS: string[] = envOrigins
  ? envOrigins.split(",").map((s) => s.trim()).filter(Boolean)
  : ["https://reliure.page", "http://localhost:5173"];

export function getCorsHeaders(req: Request) {
  const origin = req.headers.get("origin") || "";
  const isAllowed = ALLOWED_ORIGINS.includes(origin);
  return {
    "Access-Control-Allow-Origin": isAllowed ? origin : ALLOWED_ORIGINS[0],
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
  };
}
