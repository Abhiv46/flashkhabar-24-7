import { CATEGORIES, fetchCategoryItems } from '../lib/news';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://flashkhabar.example.com';

export const revalidate = 300;

export default async function sitemap() {
  const entries = [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: 'hourly',
      priority: 1.0,
    },
  ];

  const results = await Promise.allSettled(
    CATEGORIES.map((cat) => fetchCategoryItems(cat.id))
  );

  const seen = new Set();
  for (const result of results) {
    if (result.status !== 'fulfilled') continue;
    for (const item of result.value) {
      if (seen.has(item.slug)) continue;
      seen.add(item.slug);
      entries.push({
        url: `${SITE_URL}/article/${item.slug}`,
        lastModified: new Date(item.pubDate),
        changeFrequency: 'never',
        priority: 0.7,
      });
    }
  }

  return entries;
}
