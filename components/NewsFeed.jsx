'use client';

import { useState, useEffect, useCallback, Fragment } from 'react';
import Link from 'next/link';
import { getCategoryMeta, isBreaking, isLiveTitle } from '../lib/meta';
import ArticleImage from './ArticleImage';

function timeAgoClient(dateStr) {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function NewsFeed({ categories, initialCategoryId, initialItems }) {
  const [activeCat, setActiveCat] = useState(initialCategoryId);
  const [items, setItems] = useState(initialItems);
  const [loading, setLoading] = useState(false);
  const [updatedAt, setUpdatedAt] = useState(Date.now());
  const [clock, setClock] = useState('');

  useEffect(() => {
    const tick = () =>
      setClock(new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const loadCategory = useCallback(async (catId, { silent } = {}) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch(`/api/news?cat=${catId}`);
      const data = await res.json();
      if (data.ok) {
        setItems(data.items);
        setUpdatedAt(Date.now());
      }
    } finally {
      setLoading(false);
    }
  }, []);

  function switchTab(catId) {
    setActiveCat(catId);
    if (catId === initialCategoryId) {
      setItems(initialItems); // reuse server-rendered data, no fetch needed
      setUpdatedAt(Date.now());
    } else {
      loadCategory(catId);
    }
  }

  // auto-refresh current tab every 5 minutes
  useEffect(() => {
    const id = setInterval(() => loadCategory(activeCat, { silent: true }), 5 * 60 * 1000);
    return () => clearInterval(id);
  }, [activeCat, loadCategory]);

  const tickerItems = items.slice(0, 10);

  return (
    <>
      <header>
        <div className="header-top">
          <Link href="/" className="logo">
            Flash<span>Khabar</span>
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div className="live-badge">
              <span className="live-dot" />
              LIVE
            </div>
            <div style={{ fontSize: 12, color: '#a9a49a' }}>{clock}</div>
          </div>
        </div>

        <div
          style={{
            background: 'var(--marigold)',
            color: 'var(--ink)',
            overflow: 'hidden',
            whiteSpace: 'nowrap',
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          <div
            style={{
              display: 'inline-block',
              padding: '8px 0',
              animation: 'scroll-left 45s linear infinite',
            }}
          >
            {tickerItems.concat(tickerItems).map((it, i) => (
              <span key={i} style={{ marginRight: 60 }}>
                📰 {it.title}
              </span>
            ))}
          </div>
        </div>

        <nav className="tabs">
          {categories.map((cat) => (
            <button
              key={cat.id}
              className={`tab${activeCat === cat.id ? ' active' : ''}`}
              onClick={() => switchTab(cat.id)}
            >
              {cat.label}
            </button>
          ))}
        </nav>
      </header>

      <main>
        <div className="ad-slot leaderboard">Ad Slot — 970×90 Leaderboard (AdSense code yahan)</div>

        <div className="status-line">
          <span>
            {loading
              ? 'Loading latest news…'
              : `${items.length} stories · updated ${timeAgoClient(new Date(updatedAt).toISOString())}`}
          </span>
          <button
            onClick={() => loadCategory(activeCat)}
            style={{
              background: 'var(--ink)',
              color: 'var(--paper)',
              border: 'none',
              padding: '7px 14px',
              borderRadius: 20,
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Refresh
          </button>
        </div>

        <div className="grid">
          {items.length === 0 && !loading && (
            <div className="empty-state">Is category me abhi koi story nahi mili.</div>
          )}
          {items.map((item, idx) => {
            const meta = getCategoryMeta(item.categoryId);
            const breaking = isBreaking(item.pubDate);
            const live = isLiveTitle(item.title);
            const hero = idx === 0;
            return (
              <Fragment key={item.slug}>
                <Link
                  href={`/article/${item.slug}`}
                  className={`card${hero ? ' card-hero' : ''}`}
                >
                  <div className="card-image-wrap">
                    <ArticleImage
                      src={item.image}
                      icon={meta.icon}
                      color={meta.color}
                      className="card-image"
                      loading={hero ? 'eager' : 'lazy'}
                    />
                    <div
                      className="card-image-fade"
                      style={{
                        background: `linear-gradient(180deg, ${meta.color}00 40%, ${meta.color}CC 100%)`,
                      }}
                    />
                    <div className="card-badges">
                      {breaking && <span className="badge badge-breaking">🔴 BREAKING</span>}
                      {live && !breaking && <span className="badge badge-live">● LIVE</span>}
                      <span className="badge badge-cat" style={{ background: meta.color }}>
                        {meta.icon} {item.category}
                      </span>
                    </div>
                  </div>
                  <div className="card-body">
                    <div className="card-title">{item.title}</div>
                    <div className="card-meta">
                      <span>{item.source}</span>
                      <span>{timeAgoClient(item.pubDate)}</span>
                    </div>
                  </div>
                </Link>
                {(idx + 1) % 6 === 0 && (
                  <div className="ad-slot in-feed">Ad Slot — In-feed native unit</div>
                )}
              </Fragment>
            );
          })}
        </div>
      </main>

      <footer>
        FlashKhabar — Aggregated headlines from public RSS feeds. Full stories link to the
        original publisher.
        <br />
        Content refreshes automatically. No login required.
      </footer>

      <style jsx>{`
        @keyframes scroll-left {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
      `}</style>
    </>
  );
}
