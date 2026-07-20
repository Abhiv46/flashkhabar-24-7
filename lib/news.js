import { XMLParser } from 'fast-xml-parser';
import { fetchOgImage } from './ogImage';

// ---------------------------------------------------------------------------
// Categories → Google News RSS feeds (India edition)
// ---------------------------------------------------------------------------
export const CATEGORIES = [
  { id: 'top', label: 'Top Stories', feed: 'https://news.google.com/rss?hl=en-IN&gl=IN&ceid=IN:en' },
  { id: 'india', label: 'India', feed: 'https://news.google.com/rss/headlines/section/topic/NATION?hl=en-IN&gl=IN&ceid=IN:en' },
  { id: 'world', label: 'World', feed: 'https://news.google.com/rss/headlines/section/topic/WORLD?hl=en-IN&gl=IN&ceid=IN:en' },
  { id: 'business', label: 'Business', feed: 'https://news.google.com/rss/headlines/section/topic/BUSINESS?hl=en-IN&gl=IN&ceid=IN:en' },
  { id: 'tech', label: 'Technology', feed: 'https://news.google.com/rss/headlines/section/topic/TECHNOLOGY?hl=en-IN&gl=IN&ceid=IN:en' },
  { id: 'sports', label: 'Sports', feed: 'https://news.google.com/rss/headlines/section/topic/SPORTS?hl=en-IN&gl=IN&ceid=IN:en' },
  { id: 'entertainment', label: 'Entertainment', feed: 'https://news.google.com/rss/headlines/section/topic/ENTERTAINMENT?hl=en-IN&gl=IN&ceid=IN:en' },
  {
    id: 'markets',
    label: 'Markets & Trading',
    feed:
      'https://news.google.com/rss/search?q=(sensex%20OR%20nifty%20OR%20%22stock%20market%22%20OR%20forex%20OR%20crypto%20OR%20bitcoin%20OR%20%22gold%20price%22%20OR%20rbi%20OR%20trading)&hl=en-IN&gl=IN&ceid=IN:en',
  },
];

export function getCategory(id) {
  return CATEGORIES.find((c) => c.id === id) || CATEGORIES[0];
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
});

function stripHtml(html = '') {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

// ---------------------------------------------------------------------------
// Fetch + parse a category's RSS feed
// ---------------------------------------------------------------------------
export async function fetchCategoryItems(catId) {
  const cat = getCategory(catId);

  const res = await fetch(cat.feed, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; FlashKhabarBot/1.0)' },
    next: { revalidate: 300 }, // ISR: refetch at most every 5 minutes
  });

  if (!res.ok) throw new Error(`Feed request failed (${res.status})`);

  const xml = await res.text();
  const parsed = parser.parse(xml);
  const rawItems = parsed?.rss?.channel?.item;
  const rawList = Array.isArray(rawItems) ? rawItems : rawItems ? [rawItems] : [];

  // Build the base fields first (fast, no network).
  const baseItems = rawList.map((it) => {
    const title = stripHtml(it.title || '').trim();
    const link = it.link || '';
    const pubDate = it.pubDate || new Date().toUTCString();
    const source =
      (it.source && (typeof it.source === 'object' ? it.source['#text'] : it.source)) ||
      'Unknown Source';

    // Google News description is an HTML snippet with a link list; pull first sentence-ish chunk.
    const rawDesc = stripHtml(it.description || '');
    const summary = rawDesc && rawDesc.length > 20 ? rawDesc : `Read the full story from ${source}.`;

    return { title, link, pubDate, source, summary, category: cat.label, categoryId: cat.id };
  });

  // Fetch each article's REAL image (og:image from the actual source page) in
  // parallel. Slow/blocked publishers just resolve to null — never breaks the page.
  const imageResults = await Promise.allSettled(baseItems.map((it) => fetchOgImage(it.link)));

  return baseItems.map((it, i) => {
    const image = imageResults[i].status === 'fulfilled' ? imageResults[i].value : null;
    const full = { ...it, image };
    return { ...full, slug: makeSlug(full) };
  });
}

// ---------------------------------------------------------------------------
// Slug = human-readable title part + "." + base64url-encoded data payload.
// This lets /article/[slug] pages render WITHOUT any database — the URL
// itself carries everything needed to build the page and its SEO metadata.
// ---------------------------------------------------------------------------
function slugifyTitle(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 70)
    .replace(/-+$/, '');
}

export function makeSlug(data) {
  const payload = {
    t: data.title,
    l: data.link,
    s: data.source,
    d: data.pubDate,
    c: data.category,
    ci: data.categoryId,
    sm: (data.summary || '').slice(0, 160), // trimmed — keeps URLs shorter; full text isn't needed to render the page
    im: data.image || '',
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${slugifyTitle(data.title)}.${encoded}`;
}

export function decodeSlug(slug) {
  const dotIdx = slug.lastIndexOf('.');
  if (dotIdx === -1) return null;
  const encoded = slug.slice(dotIdx + 1);
  try {
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf-8'));
    return {
      title: payload.t,
      link: payload.l,
      source: payload.s,
      pubDate: payload.d,
      category: payload.c,
      categoryId: payload.ci,
      summary: payload.sm,
      image: payload.im || null,
    };
  } catch {
    return null;
  }
}

export function timeAgo(dateStr) {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}
