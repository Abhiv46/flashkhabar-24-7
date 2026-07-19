// ---------------------------------------------------------------------------
// Visual metadata per category (color + icon) and a deterministic thumbnail
// generator. We use Picsum's seeded photo service so every article gets a
// consistent, real photo (same slug always renders the same image, no
// broken links, no API key needed) without needing to scrape publisher
// sites for their actual images.
// ---------------------------------------------------------------------------

export const CATEGORY_META = {
  top: { color: '#e8952e', icon: '🔥', label: 'Top Stories' },
  india: { color: '#2c6e68', icon: '🇮🇳', label: 'India' },
  world: { color: '#3b6ea5', icon: '🌍', label: 'World' },
  business: { color: '#1f8a5f', icon: '💼', label: 'Business' },
  tech: { color: '#6d5acd', icon: '💻', label: 'Technology' },
  sports: { color: '#d94f30', icon: '🏆', label: 'Sports' },
  entertainment: { color: '#c23b7a', icon: '🎬', label: 'Entertainment' },
  markets: { color: '#b8860b', icon: '📈', label: 'Markets & Trading' },
};

export function getCategoryMeta(categoryId) {
  return CATEGORY_META[categoryId] || CATEGORY_META.top;
}

// Simple deterministic string hash -> used to seed the image so the same
// article always shows the same photo across reloads/visitors.
function hashSeed(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h).toString(36);
}

export function getArticleImage(slug, width = 640, height = 360) {
  const seed = hashSeed(slug);
  return `https://picsum.photos/seed/${seed}/${width}/${height}`;
}

// Is this fresh enough to badge as breaking?
export function isBreaking(pubDate) {
  const diffMs = Date.now() - new Date(pubDate).getTime();
  return diffMs < 60 * 60 * 1000; // under 1 hour old
}

export function isLiveTitle(title) {
  return /\bLIVE\b/.test(title || '');
}
