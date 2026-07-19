import Link from 'next/link';
import { notFound } from 'next/navigation';
import { decodeSlug, fetchCategoryItems, timeAgo } from '../../../lib/news';
import { rewriteSummary } from '../../../lib/rewrite';
import { getCategoryMeta, getArticleImage, isBreaking, isLiveTitle } from '../../../lib/meta';

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
  const image = getArticleImage(params.slug, 1200, 630);

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
      images: [{ url: image, width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      title: data.title,
      description,
      images: [image],
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
  const meta = getCategoryMeta(data.categoryId);
  const breaking = isBreaking(data.pubDate);
  const live = isLiveTitle(data.title);

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

        <div className="article-hero-wrap">
          <img
            src={getArticleImage(params.slug, 900, 500)}
            alt=""
            className="article-hero-image"
          />
          <div className="card-badges" style={{ position: 'absolute', top: 12, left: 12 }}>
            {breaking && <span className="badge badge-breaking">🔴 BREAKING</span>}
            {live && !breaking && <span className="badge badge-live">● LIVE</span>}
          </div>
        </div>

        <div className="article-cat" style={{ color: meta.color }}>
          {meta.icon} {data.category}
        </div>
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
              {relatedItems.map((item) => {
                const rMeta = getCategoryMeta(item.categoryId);
                return (
                  <Link href={`/article/${item.slug}`} className="card" key={item.slug}>
                    <div className="card-image-wrap">
                      <img
                        src={getArticleImage(item.slug, 480, 280)}
                        alt=""
                        loading="lazy"
                        className="card-image"
                      />
                      <div
                        className="card-image-fade"
                        style={{
                          background: `linear-gradient(180deg, ${rMeta.color}00 40%, ${rMeta.color}CC 100%)`,
                        }}
                      />
                      <div className="card-badges">
                        <span className="badge badge-cat" style={{ background: rMeta.color }}>
                          {rMeta.icon} {item.category}
                        </span>
                      </div>
                    </div>
                    <div className="card-body">
                      <div className="card-title">{item.title}</div>
                      <div className="card-meta">
                        <span>{item.source}</span>
                        <span>{timeAgo(item.pubDate)}</span>
                      </div>
                    </div>
                  </Link>
                );
              })}
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
