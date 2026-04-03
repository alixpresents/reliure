import { getCorsHeaders } from "../_shared/cors.ts";

// ---------------------------------------------------------------------------
// Token cache (module-level, persiste entre les requêtes warm)
// ---------------------------------------------------------------------------
let cachedToken: string | null = null;
let tokenExpiresAt = 0;

async function getElectreToken(): Promise<string> {
  const now = Date.now();
  if (cachedToken && tokenExpiresAt > now + 60_000) {
    return cachedToken;
  }

  const authUrl = Deno.env.get("ELECTRE_AUTH_URL");
  const username = Deno.env.get("ELECTRE_USERNAME");
  const password = Deno.env.get("ELECTRE_PASSWORD");

  if (!authUrl || !username || !password) {
    throw new Error("Missing ELECTRE_AUTH_URL, ELECTRE_USERNAME or ELECTRE_PASSWORD");
  }

  const res = await fetch(authUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "password",
      client_id: "api-client",
      username,
      password,
      scope: "roles",
    }),
    signal: AbortSignal.timeout(8000),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Electre auth failed: ${res.status} ${text}`);
  }

  const data = await res.json();
  cachedToken = data.access_token;
  tokenExpiresAt = now + (data.expires_in || 300) * 1000;
  return cachedToken!;
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: getCorsHeaders(req) });
  }

  const apiUrl = Deno.env.get("ELECTRE_API_URL");
  if (!apiUrl) {
    return Response.json(
      { error: "ELECTRE_API_URL not configured" },
      { status: 500, headers: getCorsHeaders(req) },
    );
  }

  try {
    const { eans } = await req.json();

    if (!Array.isArray(eans) || eans.length === 0) {
      return Response.json(
        { error: "eans array required" },
        { status: 400, headers: getCorsHeaders(req) },
      );
    }
    if (eans.length > 100) {
      return Response.json(
        { error: "max 100 EANs per request" },
        { status: 400, headers: getCorsHeaders(req) },
      );
    }

    const token = await getElectreToken();

    const params = new URLSearchParams();
    eans.forEach((ean: string) => params.append("ean", ean));
    params.append("catalogue", "livre");
    params.append("editions-liees", "false");

    const res = await fetch(`${apiUrl}/notices/eans?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return Response.json(
        { error: `Electre API ${res.status}`, detail: text },
        { status: res.status, headers: getCorsHeaders(req) },
      );
    }

    const data = await res.json();
    return Response.json(data, {
      headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[electre-proxy] error:", err);
    return Response.json(
      { error: (err as Error).message },
      { status: 500, headers: getCorsHeaders(req) },
    );
  }
});
