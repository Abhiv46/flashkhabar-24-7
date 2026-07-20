// Fetches the REAL image for a news article by reading the actual source
// page's <meta property="og:image"> (or twitter:image) tag. This is what
// makes thumbnails match the story instead of showing random stock photos.
//
// We only read the first ~40KB of each page (og:image sits in <head>, so
// we don't need the full article body) and give up after 4.5s — a slow or
// blocked publisher just falls back to no image instead of hanging the
// whole category fetch.

const UA = 'Mozilla/5.0 (compatible; FlashKhabarBot/1.0; +https://flashkhabar.example.com)';

async function fetchPartialHtml(url, maxBytes = 150000, timeoutMs = 6000) {
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

function safeHost(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
}

// Google News RSS <link> URLs point at news.google.com, not the publisher.
// Fetching them returns an interstitial page whose own og:image is Google's
// app icon — not the actual story photo. We resolve through that
// interstitial (up to 2 hops) to reach the real publisher URL before
// extracting an image. Modern Google News pages are JS-driven, so the real
// URL isn't always in a simple meta-refresh — we fall back to scanning the
// raw page (including JSON-escaped "https:\/\/..." strings) for the first
// non-Google link.
function findRealUrlInInterstitial(html, baseUrl) {
  const metaMatch = html.match(
    /<meta[^>]+http-equiv=["']refresh["'][^>]+content=["']\d+;\s*url=['"]?([^"'>]+?)['"]?["']/i
  );
  if (metaMatch?.[1]) return metaMatch[1];

  const jsMatch = html.match(/(?:window\.location(?:\.href)?|location\.replace)\s*\(?=?\s*["']([^"']+)["']/i);
  if (jsMatch?.[1]) return jsMatch[1];

  const canonicalMatch = html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i);
  if (canonicalMatch?.[1] && !/news\.google\.com/.test(canonicalMatch[1])) return canonicalMatch[1];

  // Last resort: unescape JSON-style "https:\/\/" sequences and grab the
  // first https URL that isn't pointing back at Google itself.
  const unescaped = html.replace(/\\\//g, '/');
  const genericMatches = unescaped.match(
    /https:\/\/(?!news\.google\.com|www\.google\.com|accounts\.google\.com|policies\.google\.com|support\.google\.com|schema\.org|gstatic\.com|googleusercontent\.com|fonts\.googleapis\.com)[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}[^\s"'<>\\)]*/g
  );
  if (genericMatches && genericMatches.length) {
    // Prefer the shortest sane-looking match (long ones are often truncated mid-token JSON blobs)
    const sorted = [...genericMatches].sort((a, b) => a.length - b.length);
    return sorted.find((u) => u.length > 12) || null;
  }

  return null;
}

async function fetchArticleHtml(url, hopsLeft = 2) {
  const partial = await fetchPartialHtml(url);
  if (!partial) return null;

  const host = safeHost(partial.finalUrl);
  if (host.includes('news.google.com') && hopsLeft > 0) {
    const target = findRealUrlInInterstitial(partial.html, partial.finalUrl);

    if (target) {
      let real;
      try {
        real = target.startsWith('http') ? target : new URL(target, partial.finalUrl).href;
      } catch {
        real = null;
      }
      if (real && !safeHost(real).includes('news.google.com')) {
        return fetchArticleHtml(real, hopsLeft - 1);
      }
    }
    return null; // couldn't get past Google's interstitial
  }

  return partial;
}

// Cache resolved images in-memory for the life of the server instance so we
// don't re-scrape the same article repeatedly within a single ISR window.
const cache = new Map();
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6h

export async function fetchOgImage(articleUrl) {
  if (!articleUrl) return null;

  const cached = cache.get(articleUrl);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.value;

  const result = await fetchArticleHtml(articleUrl);
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

  // Safety net: never surface Google's own branding as if it were the story photo.
  if (resolved && /(^|\.)google(usercontent)?\.com$|(^|\.)gstatic\.com$/.test(safeHost(resolved))) {
    resolved = null;
  }

  cache.set(articleUrl, { value: resolved, at: Date.now() });
  return resolved;
}
