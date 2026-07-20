// Fetches the REAL image for a news article by reading the actual source
// page's <meta property="og:image"> (or twitter:image) tag. This is what
// makes thumbnails match the story instead of showing random stock photos.
//
// We only read the first ~40KB of each page (og:image sits in <head>, so
// we don't need the full article body) and give up after 4.5s — a slow or
// blocked publisher just falls back to no image instead of hanging the
// whole category fetch.

const UA = 'Mozilla/5.0 (compatible; FlashKhabarBot/1.0; +https://flashkhabar.example.com)';

async function fetchPartialHtml(url, maxBytes = 40000, timeoutMs = 4500) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: { 'User-Agent': UA, Accept: 'text/html' },
    });
    if (!res.ok || !res.body) return null;

    const reader = res.body.getReader();
    const chunks = [];
    let received = 0;
    while (received < maxBytes) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      received += value.length;
    }
    reader.cancel().catch(() => {});
    const buf = Buffer.concat(chunks.map((c) => Buffer.from(c)));
    return { html: buf.toString('utf-8'), finalUrl: res.url || url };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function extractMetaImage(html) {
  const patterns = [
    /<meta[^>]+property=["']og:image(?::secure_url)?["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image(?::secure_url)?["']/i,
    /<meta[^>]+name=["']twitter:image(?::src)?["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image(?::src)?["']/i,
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m && m[1]) return m[1];
  }
  return null;
}

// Cache resolved images in-memory for the life of the server instance so we
// don't re-scrape the same article repeatedly within a single ISR window.
const cache = new Map();
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6h

export async function fetchOgImage(articleUrl) {
  if (!articleUrl) return null;

  const cached = cache.get(articleUrl);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.value;

  const result = await fetchPartialHtml(articleUrl);
  if (!result) {
    cache.set(articleUrl, { value: null, at: Date.now() });
    return null;
  }

  const raw = extractMetaImage(result.html);
  if (!raw) {
    cache.set(articleUrl, { value: null, at: Date.now() });
    return null;
  }

  let resolved;
  try {
    resolved = new URL(raw, result.finalUrl).href;
  } catch {
    resolved = null;
  }

  cache.set(articleUrl, { value: resolved, at: Date.now() });
  return resolved;
}
