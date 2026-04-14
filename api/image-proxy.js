import sharp from "sharp";

export const config = { runtime: "nodejs" };

const ALLOWED_HOSTS = [
  "media.electre-ng-horsprod.com",
  "images.centprod.com",
  "books.google.com",
  "covers.openlibrary.org",
  "surapdwhffynilpwdlkx.supabase.co",
];

function isAllowed(hostname) {
  if (ALLOWED_HOSTS.includes(hostname)) return true;
  // *.archive.org (ia800201.us.archive.org, etc.)
  if (hostname.endsWith(".archive.org")) return true;
  return false;
}

export default async function handler(req, res) {
  const { url, w, q } = req.query;

  if (!url) {
    return res.status(400).json({ error: "Missing url parameter" });
  }

  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return res.status(400).json({ error: "Invalid url" });
  }

  if (!isAllowed(parsed.hostname)) {
    return res.status(400).json({ error: "Domain not allowed" });
  }

  const width = Math.min(Math.max(parseInt(w, 10) || 200, 16), 800);
  const quality = Math.min(Math.max(parseInt(q, 10) || 75, 10), 100);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const upstream = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "Reliure/1.0 image-proxy" },
    });
    clearTimeout(timeout);

    if (!upstream.ok) {
      return res.redirect(302, url);
    }

    const buffer = Buffer.from(await upstream.arrayBuffer());

    const webp = await sharp(buffer)
      .resize({ width, withoutEnlargement: true })
      .webp({ quality })
      .toBuffer();

    res.setHeader("Content-Type", "image/webp");
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    return res.send(webp);
  } catch (err) {
    clearTimeout(timeout);
    if (err.name === "AbortError") {
      return res.status(504).json({ error: "Upstream timeout" });
    }
    // Sharp failure or other — fallback to original
    return res.redirect(302, url);
  }
}
