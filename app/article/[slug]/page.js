import Link from 'next/link';
import { notFound } from 'next/navigation';
import { decodeSlug, fetchCategoryItems, timeAgo } from '../../../lib/news';
import { rewriteSummary } from '../../../lib/rewrite';

export const revalidate = 300;

function getData(slug) {
  const data = decodeSlug(slug);
  if (!data) return null;
  return data;
}

export async function generateMetadata({ params }) {
  const data = getData(params.slug);
  if (!data) return {};

  const description =
    data.summary.length > 155 ? data.summary.slice(0, 152).trimEnd() + '…' : data.summary;

  return {
    title: data.title,
    description,
    alternates: {
      canonical: `/article/${params.slug}`,
    },
    openGraph: {
      title: data.title,
      description,
      type: 'article',
      publishedTime: new Date(data.pubDate).toISOString(),
      section: data.category,
    },
    twitter: {
      card: 'summary',
      title: data.title,
      description,
    },
  };
}

export default async function ArticlePage({ params }) {
  const data = getData(params.slug);
  if (!data) notFound();

  const [summary, related] = await Promise.all([
    rewriteSummary({ title: data.title, summary: data.summary, source: data.source }),
    fetchCategoryItems(data.categoryId).catch(() => []),
  ]);

  const relatedItems = related.filter((r) => r.slug !== params.slug).slice(0, 4);
  const waText = encodeURIComponent(`${data.title}\n\n${data.link}`);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: data.title,
    datePublished: new Date(data.pubDate).toISOString(),
    articleSection: data.category,
    publisher: {
      '@type': 'Organization',
      name: 'FlashKhabar',
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `/article/${params.slug}`,
    },
    isBasedOn: data.link,
  };

  return (
    <>
      <header>
        <div className="header-top">
          <Link href="/" className="logo">
            Flash<span>Khabar</span>
          </Link>
        </div>
      </header>

      <div className="article-wrap">
        <div className="breadcrumb">
          <Link href="/">Home</Link> / {data.category}
        </div>

        <div className="article-cat">{data.category}</div>
        <h1 className="article-title">{data.title}</h1>
        <div className="article-meta">
          <span>{data.source}</span>
          <span>{timeAgo(data.pubDate)}</span>
        </div>

        <p className="article-summary">{summary}</p>

        <div className="ad-slot" style={{ height: 100, marginBottom: 26 }}>
          Ad Slot — In-article 300×100
        </div>

        <div className="action-row">
          <a className="btn btn-source" href={data.link} target="_blank" rel="noopener noreferrer">
            Read Full Story at {data.source} →
          </a>
          <a
            className="btn btn-whatsapp"
            href={`https://wa.me/?text=${waText}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            Share on WhatsApp
          </a>
        </div>

        {relatedItems.length > 0 && (
          <>
            <div className="related-heading">More in {data.category}</div>
            <div className="grid">
              {relatedItems.map((item) => (
                <Link href={`/article/${item.slug}`} className="card" key={item.slug}>
                  <div className="card-body">
                    <div className="card-cat">{item.category}</div>
                    <div className="card-title">{item.title}</div>
                    <div className="card-meta">
                      <span>{item.source}</span>
                      <span>{timeAgo(item.pubDate)}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>

      <footer>
        FlashKhabar — Aggregated headline from a public RSS feed. Summary may be AI-rewritten for
        clarity; full story is at the original publisher above.
      </footer>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </>
  );
}
