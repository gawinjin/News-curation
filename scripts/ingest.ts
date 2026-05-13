// Pull recent items from allowed RSS feeds into data/inbox.json. Skips URLs already
// present in data/state.json. Run with `npm run ingest`. No paid APIs — RSS only.

import fs from 'node:fs/promises';
import path from 'node:path';
import { SOURCES } from '../src/lib/sources.js';

const ROOT = path.resolve(new URL('..', import.meta.url).pathname);
const STATE = path.join(ROOT, 'data', 'state.json');
const INBOX = path.join(ROOT, 'data', 'inbox.json');
const DAYS = 7;

type State = { covered: string[]; lastIngest?: string };
type InboxItem = {
  title: string;
  url: string;
  source: string;
  sourceId: string;
  category: string;
  publishedAt: string;
  summary?: string;
};

async function readJSON<T>(p: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await fs.readFile(p, 'utf8'));
  } catch {
    return fallback;
  }
}

function stripHtml(s: string): string {
  return s
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

function tagText(xml: string, tag: string): string | null {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i');
  const m = xml.match(re);
  if (!m) return null;
  let v = m[1].trim();
  const cd = v.match(/^<!\[CDATA\[([\s\S]*?)\]\]>$/);
  if (cd) v = cd[1];
  return v;
}

function tagAttr(xml: string, tag: string, attr: string): string | null {
  const re = new RegExp(`<${tag}[^>]*\\b${attr}=["']([^"']+)["']`, 'i');
  const m = xml.match(re);
  return m ? m[1] : null;
}

function parseItems(xml: string): { title: string; url: string; published?: string; summary?: string }[] {
  // Handle both RSS <item> and Atom <entry>
  const items: { title: string; url: string; published?: string; summary?: string }[] = [];
  const re = /<(item|entry)[\s\S]*?<\/\1>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml))) {
    const block = m[0];
    const title = stripHtml(tagText(block, 'title') || '').slice(0, 200);
    let url = tagText(block, 'link') || '';
    if (!url || /^\s*<\/?/.test(url)) {
      url = tagAttr(block, 'link', 'href') || '';
    }
    url = url.trim();
    const published = tagText(block, 'pubDate') || tagText(block, 'published') || tagText(block, 'updated') || undefined;
    const summaryRaw = tagText(block, 'description') || tagText(block, 'summary') || tagText(block, 'content') || '';
    const summary = stripHtml(summaryRaw).slice(0, 280);
    if (title && url) items.push({ title, url, published, summary });
  }
  return items;
}

async function fetchFeed(url: string): Promise<string | null> {
  try {
    const ua = process.env.USER_AGENT || 'SignalBot/0.1 (+https://signal.pages.dev)';
    const r = await fetch(url, { headers: { 'user-agent': ua, accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9, */*;q=0.5' } });
    if (!r.ok) return null;
    return await r.text();
  } catch {
    return null;
  }
}

async function main() {
  const state = await readJSON<State>(STATE, { covered: [] });
  const covered = new Set(state.covered);
  const cutoff = Date.now() - DAYS * 24 * 60 * 60 * 1000;
  const inbox: InboxItem[] = [];
  let okFeeds = 0;
  let failedFeeds = 0;

  for (const src of SOURCES) {
    const xml = await fetchFeed(src.feed);
    if (!xml) {
      console.warn(`[skip] ${src.id} — feed unreachable`);
      failedFeeds++;
      continue;
    }
    okFeeds++;
    const items = parseItems(xml);
    for (const it of items) {
      const ts = it.published ? Date.parse(it.published) : NaN;
      if (Number.isFinite(ts) && ts < cutoff) continue;
      if (covered.has(it.url)) continue;
      inbox.push({
        title: it.title,
        url: it.url,
        source: src.name,
        sourceId: src.id,
        category: src.category,
        publishedAt: Number.isFinite(ts) ? new Date(ts).toISOString() : new Date().toISOString(),
        summary: it.summary,
      });
    }
  }

  inbox.sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));
  await fs.mkdir(path.dirname(INBOX), { recursive: true });
  await fs.writeFile(INBOX, JSON.stringify({ generatedAt: new Date().toISOString(), items: inbox }, null, 2));

  console.log(`Ingest complete. Feeds OK: ${okFeeds}, failed: ${failedFeeds}. Candidates: ${inbox.length}.`);
  console.log(`Wrote ${path.relative(ROOT, INBOX)}.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
