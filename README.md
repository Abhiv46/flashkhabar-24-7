# FlashKhabar

Auto-updating news site built on Next.js 14 (App Router), deployable on Vercel.
No database, no manual posting — pulls live from Google News RSS and gives every
article a real, indexable URL.

## What's different from a simple HTML/JS version

| | Client-side SPA (v1) | This version (v2) |
|---|---|---|
| Article URLs | None — everything on one page | Every article gets its own real URL (`/article/...`) |
| Google can index articles | No | Yes |
| Content | Copy of RSS snippet | Optional AI-rewritten original summary |
| Sitemap | Static, homepage only | Dynamic, includes every current article |
| Rendering | Client-side only | Server-rendered (fast, crawlable) |

This matters because **search ranking is impossible without indexable pages** —
that was the core limitation of the earlier prototype.

## How the "no database" trick works

Each article's URL looks like:

```
/article/sensex-jumps-500-points.eyJ0IjoiU2Vuc2V4...
```

Everything needed to render that page (title, link, source, summary, category,
date) is encoded directly into the URL itself (base64url JSON after the last
`.`). There's no database to run out of sync, no storage cost, and no
"article not found" errors — the URL *is* the data.

Trade-off: URLs are longer than a typical news site's. This is a deliberate
simplicity/cost trade-off. If you later want short, pretty URLs, that requires
a real database (e.g. Vercel Postgres or Upstash Redis) to map short IDs →
article data — happy to build that next if you want it.

## AI-rewritten summaries (optional, recommended)

By default, article pages show the raw RSS description. Set an
`ANTHROPIC_API_KEY` environment variable in Vercel and the site will
automatically rewrite each summary in original words via the Claude API —
this is what makes the content genuinely original instead of a copy of the
source snippet, which matters for search ranking. Without the key, nothing
breaks — it just falls back to the raw text.

**Note:** this uses your own Anthropic API key and will incur small API costs
(Claude Haiku, a few hundred tokens per article, cached for 24h per article so
repeat visits don't re-call the API).

## Deploy

1. Push this folder to a new GitHub repo (same flow as your other projects).
2. Import it into Vercel — it auto-detects Next.js, no config needed.
3. In Vercel → Project → Settings → Environment Variables, set:
   - `NEXT_PUBLIC_SITE_URL` — your real domain (e.g. `https://flashkhabar.com`)
   - `ANTHROPIC_API_KEY` — optional, for AI-rewritten summaries
4. After first deploy, submit `https://yourdomain.com/sitemap.xml` to
   [Google Search Console](https://search.google.com/search-console).

## Local development

```bash
npm install
npm run dev
```

Note: this sandbox's own network blocks `news.google.com` and Google
Fonts, so a full local build couldn't be verified end-to-end here — but the
app compiles cleanly, and both of those domains are reachable from Vercel's
build/runtime servers with no changes needed.

## Where to add AdSense

Three ad slots are already placed and marked with `Ad Slot` placeholder
divs: the leaderboard on every page, an in-feed unit every 6 articles on the
homepage, and an in-article unit on every article page. Once your AdSense
account is approved, replace those divs with your ad unit code.

## Still true from before

Fast, massive traffic on day one still isn't realistic from organic search
alone — that takes months regardless of the tech. What this version fixes is
the technical blocker that made ranking *impossible*. For real early traffic,
keep leaning on the WhatsApp/Telegram share buttons already built in.
