// Fetches the latest Substack posts and writes posts.json for the Blog tab.
// Run by .github/workflows/substack.yml on a schedule (and on demand).
// No dependencies — uses Node's built-in fetch (Node 18+).
//
// Substack blocks direct feed fetches from datacenter IPs (GitHub runners get
// HTTP 403), so we try the official JSON API first and fall back to rss2json,
// a hosted service that fetches the feed from its own infrastructure.

const PUBLICATION = 'https://duckingthetax.substack.com';
const FEED = `${PUBLICATION}/feed`;
const MAX_POSTS = 12;
const MIN_VALID = 5; // refuse to write fewer than this — guards against truncated/partial responses
const OUT = new URL('../posts.json', import.meta.url);

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

function clean(p) {
  return {
    title: (p.title || '').trim(),
    url: (p.url || '').trim(),
    date: (p.date || '').trim(),
    image: (p.image || '').trim(),
  };
}
function valid(posts) {
  const ok = posts.map(clean).filter((p) => p.title && p.url);
  return ok.length >= MIN_VALID ? ok.slice(0, MAX_POSTS) : null;
}

// Source 1: Substack's official JSON API (richest; may 403 from cloud IPs).
async function fromSubstackApi() {
  const res = await fetch(`${PUBLICATION}/api/v1/posts?limit=${MAX_POSTS}`, {
    headers: { 'User-Agent': UA, 'Accept': 'application/json' },
  });
  if (!res.ok) throw new Error(`Substack API HTTP ${res.status}`);
  const data = await res.json();
  if (!Array.isArray(data)) throw new Error('Substack API: unexpected shape');
  return data.map((p) => ({
    title: p.title,
    url: p.canonical_url,
    date: p.post_date,
    image: p.cover_image || '',
  }));
}

// Source 2: rss2json fetches the feed server-side and returns structured JSON.
// A free API key (env RSS2JSON_API_KEY) gives a private quota — the keyless
// endpoint rate-limits shared CI IPs (HTTP 422). Strongly recommended for CI.
async function fromRss2Json() {
  const key = process.env.RSS2JSON_API_KEY;
  let u = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(FEED)}&count=${MAX_POSTS}`;
  if (key) u += `&api_key=${encodeURIComponent(key)}`;
  const res = await fetch(u, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`rss2json HTTP ${res.status}`);
  const data = await res.json();
  if (data.status !== 'ok' || !Array.isArray(data.items)) throw new Error('rss2json: not ok');
  return data.items.map((it) => ({
    title: it.title,
    url: it.link,
    date: it.pubDate,
    image: it.thumbnail || (it.enclosure && it.enclosure.link) || '',
  }));
}

const sources = [['Substack API', fromSubstackApi], ['rss2json', fromRss2Json]];
let posts = null;
for (const [name, fn] of sources) {
  try {
    const got = valid(await fn());
    if (got) { posts = got; console.log(`Got ${got.length} posts from ${name}`); break; }
    console.log(`${name}: too few valid posts, trying next…`);
  } catch (e) {
    console.log(`${name} failed: ${e.message}`);
  }
}

if (!posts) {
  console.error('All sources failed — leaving posts.json unchanged.');
  process.exit(1);
}

const { writeFileSync } = await import('node:fs');
writeFileSync(OUT, JSON.stringify(posts, null, 2) + '\n');
console.log(`Wrote ${posts.length} posts to posts.json`);
