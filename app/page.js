import { CATEGORIES, fetchCategoryItems } from '../lib/news';
import NewsFeed from '../components/NewsFeed';

export const revalidate = 300; // ISR: rebuild this page at most every 5 minutes

export default async function HomePage() {
  const initialItems = await fetchCategoryItems('top').catch(() => []);

  return (
    <NewsFeed
      categories={CATEGORIES}
      initialCategoryId="top"
      initialItems={initialItems}
    />
  );
}
