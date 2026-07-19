// Rewrites a raw RSS summary into a short, original, plain-English summary
// using the Anthropic API. This is what makes each article page "original
// content" in Google's eyes instead of a duplicate of the source snippet.
//
// Requires an ANTHROPIC_API_KEY environment variable (set it in Vercel →
// Project → Settings → Environment Variables). If it's not set, the site
// falls back to the raw RSS summary automatically — nothing breaks.

export async function rewriteSummary({ title, summary, source }) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return summary; // graceful fallback, no key configured

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 200,
        messages: [
          {
            role: 'user',
            content:
              `Rewrite this news blurb in your own original words, 2-3 short sentences, ` +
              `neutral factual tone, no speculation beyond what's given, no clickbait. ` +
              `Do not fabricate any facts, names, or numbers not present in the source text.\n\n` +
              `Headline: ${title}\nSource: ${source}\nOriginal blurb: ${summary}`,
          },
        ],
      }),
      // Cache the rewrite for a day so we don't re-call the API on every request
      next: { revalidate: 86400 },
    });

    if (!res.ok) return summary;
    const data = await res.json();
    const text = data?.content?.find((b) => b.type === 'text')?.text;
    return text?.trim() || summary;
  } catch {
    return summary; // never let a rewrite failure break the page
  }
}
