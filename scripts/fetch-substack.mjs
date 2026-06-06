// Fetches the latest Substack posts and writes posts.json for the Blog tab.
// Run by .github/workflows/substack.yml on a schedule (and on demand).
// No dependencies — uses Node's built-in fetch (Node 18+).

const FEED = 'https://duckingthetax.substack.com/feed';
const MAX_POSTS = 12;
const OUT = new URL('../posts.json', import.meta.url);

function pick(block, tag) {
  const m = block.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  if (!m) return '';
  return m[1].replace(/<!\[CDATA\[/, '').replace(/\]\]>/, '').trim();
}

function decodeEntities(s) {
  return s
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'")
    .replace(/&#8217;/g, '’').replace(/&#8216;/g, '‘')
    .replace(/&#8220;/g, '“').replace(/&#8221;/g, '”')
    .replace(/&#8211;/g, '–').replace(/&#8212;/g, '—')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n));
}

const res = await fetch(FEED, {
  headers: {
    // Substack returns 403 to non-browser agents (esp. from cloud IPs), so mimic a browser.
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept': 'application/rss+xml, application/xml;q=0.9, text/xml;q=0.8, */*;q=0.7',
    'Accept-Language': 'en-US,en;q=0.9',
  },
});
if (!res.ok) throw new Error(`Feed fetch failed: HTTP ${res.status}`);
const xml = await res.text();

const items = xml.split('<item>').slice(1).map((chunk) => chunk.split('</item>')[0]);

const posts = items.map((it) => {
  const enc = it.match(/<enclosure[^>]*url="([^"]+)"/i);
  return {
    title: decodeEntities(pick(it, 'title')),
    url: pick(it, 'link'),
    date: pick(it, 'pubDate'),                // RFC-822; formatted client-side
    image: enc ? enc[1].replace(/&amp;/g, '&') : '',
  };
}).filter((p) => p.title && p.url).slice(0, MAX_POSTS);

if (!posts.length) throw new Error('No posts parsed from feed — aborting to avoid clobbering posts.json');

const { writeFileSync } = await import('node:fs');
writeFileSync(OUT, JSON.stringify(posts, null, 2) + '\n');
console.log(`Wrote ${posts.length} posts to posts.json`);
