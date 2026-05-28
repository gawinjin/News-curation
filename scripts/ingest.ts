// Pull recent items from allowed RSS feeds + X profiles (via Nitter) + the manual
// social queue into data/inbox.json. Skips URLs already covered (data/state.json).
// Run with `npm run ingest`. No paid APIs.

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SOURCES } from '../src/lib/sources.js';
import type { Source } from '../src/lib/sources.js';
import { SOCIAL_HANDLES, nitterInstances } from '../src/lib/social-sources.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const STATE = path.join(ROOT, 'data', 'state.json');
const INBOX = path.join(ROOT, 'data', 'inbox.json');
const SOCIAL_QUEUE = path.join(ROOT, 'data', 'social-queue.json');
const SOCIAL_QUEUE_PUBLISHED = path.join(ROOT, 'data', 'social-queue.published.json');
const DAYS = 7;

type State = { covered: string[]; lastIngest?: string | null };

type InboxItem = {
  kind: 'rss' | 'social';
  title: string;
  url: string;
  source: string;
  sourceId: string;
  category: string;
  publishedAt: string;
  summary?: string;
  // Social-only fields
  handle?: string;
  via?: string;          // nitter instance hostname OR "manual"
  linkedUrls?: string[]; // http(s) URLs extracted from the tweet body — actionability signal
};

type SocialQueueEntry = { url: string; note?: string; addedAt?: string };
type FallbackItem = { title: string; url: string; publishedAt: string; summary?: string };

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

function decodeText(s: string): string {
  return stripHtml(s);
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

function metaContent(html: string, name: string): string | null {
  const re = new RegExp(`<meta[^>]+(?:property|name)=["']${name}["'][^>]+content=["']([^"']+)["'][^>]*>`, 'i');
  return html.match(re)?.[1] ?? null;
}

function parseItems(xml: string) {
  const items: { title: string; url: string; published?: string; summary?: string; rawSummary?: string }[] = [];
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
    const published =
      tagText(block, 'pubDate') || tagText(block, 'published') || tagText(block, 'updated') || undefined;
    const rawSummary =
      tagText(block, 'description') || tagText(block, 'summary') || tagText(block, 'content') || '';
    const summary = stripHtml(rawSummary).slice(0, 280);
    if (title && url) items.push({ title, url, published, summary, rawSummary });
  }
  return items;
}

async function fetchText(url: string): Promise<{ text: string | null; error?: string }> {
  try {
    const siteUrl = process.env.PUBLIC_SITE_URL || 'https://signal.gawinjin.workers.dev';
    const ua = process.env.USER_AGENT || `SignalBot/0.1 (+${siteUrl})`;
    const r = await fetch(url, {
      headers: {
        'user-agent': ua,
        accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9, */*;q=0.5',
      },
    });
    if (!r.ok) return { text: null, error: `HTTP ${r.status}` };
    return { text: await r.text() };
  } catch (e) {
    return { text: null, error: e instanceof Error ? e.message : String(e) };
  }
}

async function fetchFeed(url: string): Promise<string | null> {
  return (await fetchText(url)).text;
}

function pageTitle(html: string, url: string): string {
  const title =
    metaContent(html, 'og:title') ||
    html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ||
    new URL(url).pathname.split('/').filter(Boolean).pop()?.replace(/[-_]+/g, ' ') ||
    url;
  return decodeText(title).replace(/\s+\|\s+.*$/, '').slice(0, 200);
}

function pageSummary(html: string): string | undefined {
  const summary = metaContent(html, 'og:description') || metaContent(html, 'description') || '';
  return decodeText(summary).slice(0, 280) || undefined;
}

function pageDate(html: string, fallback?: string): string {
  const date =
    metaContent(html, 'article:published_time') ||
    html.match(/"datePublished"\s*:\s*"([^"]+)"/i)?.[1] ||
    html.match(/"dateModified"\s*:\s*"([^"]+)"/i)?.[1] ||
    html.match(/\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2},\s+\d{4}\b/i)?.[0] ||
    fallback;
  const ts = date ? Date.parse(date) : NaN;
  return Number.isFinite(ts) ? new Date(ts).toISOString() : new Date().toISOString();
}

function sitemapEntries(xml: string, include: string) {
  return [...xml.matchAll(/<url>[\s\S]*?<\/url>/gi)]
    .map((m) => {
      const block = m[0];
      return {
        url: decodeText(tagText(block, 'loc') || ''),
        lastmod: tagText(block, 'lastmod') || undefined,
      };
    })
    .filter((it) => it.url.includes(include))
    .sort((a, b) => Date.parse(b.lastmod || '') - Date.parse(a.lastmod || ''));
}

function listingUrls(html: string, include: string) {
  const urls = new Set<string>();
  const escaped = include.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`${escaped}[^"'?#<\\s]+`, 'g');
  for (const m of html.matchAll(re)) urls.add(m[0].replace(/\/$/, ''));
  return [...urls];
}

async function fallbackItems(src: Source, state: Set<string>, cutoff: number) {
  if (!src.fallback) return { items: [] as FallbackItem[], ok: false, error: 'no fallback' };
  const res = await fetchText(src.fallback.url);
  if (!res.text) return { items: [] as FallbackItem[], ok: false, error: res.error || 'unreachable' };

  const base =
    src.fallback.kind === 'sitemap'
      ? sitemapEntries(res.text, src.fallback.include).map((it) => ({ url: it.url, fallbackDate: it.lastmod }))
      : listingUrls(res.text, src.fallback.include).map((url) => ({ url, fallbackDate: undefined }));

  const items: FallbackItem[] = [];
  for (const it of base.slice(0, 20)) {
    const fallbackTs = it.fallbackDate ? Date.parse(it.fallbackDate) : NaN;
    if (Number.isFinite(fallbackTs) && fallbackTs < cutoff) continue;
    if (state.has(it.url)) continue;

    const page = await fetchText(it.url);
    if (!page.text) continue;
    const publishedAt = pageDate(page.text, it.fallbackDate);
    const ts = Date.parse(publishedAt);
    if (Number.isFinite(ts) && ts < cutoff) continue;
    items.push({
      title: pageTitle(page.text, it.url),
      url: it.url,
      publishedAt,
      summary: pageSummary(page.text),
    });
  }
  return { items, ok: true, error: undefined };
}

function extractLinks(html: string): string[] {
  const out = new Set<string>();
  const re = /https?:\/\/[^\s<>"')]+/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    let url = m[0];
    // Drop trailing punctuation
    url = url.replace(/[).,;:!?]+$/, '');
    // Skip self-references to the tweet/nitter mirror itself
    if (/nitter\.|x\.com|twitter\.com/.test(url)) continue;
    out.add(url);
  }
  return [...out];
}

function canonicalTweetUrl(handle: string, link: string): string {
  // Nitter links look like https://<instance>/<handle>/status/<id>#m — rewrite to x.com canonical.
  try {
    const u = new URL(link);
    const parts = u.pathname.split('/').filter(Boolean);
    const idx = parts.findIndex((p) => p === 'status');
    if (idx >= 0 && parts[idx + 1]) {
      return `https://x.com/${handle}/${parts.slice(idx).join('/')}`;
    }
  } catch {
    /* ignore */
  }
  return link;
}

async function fetchSocialFeed(handle: string): Promise<{ xml: string; via: string } | null> {
  for (const base of nitterInstances()) {
    const xml = await fetchFeed(`${base}/${handle}/rss`);
    if (xml && /<item\b/i.test(xml)) {
      return { xml, via: new URL(base).hostname };
    }
  }
  return null;
}

async function ingestRss(state: Set<string>, cutoff: number) {
  const inbox: InboxItem[] = [];
  let ok = 0;
  let fail = 0;
  for (const src of SOURCES) {
    const feed = await fetchText(src.feed);
    const xml = feed.text;
    if (!xml && src.fallback) {
      const fallback = await fallbackItems(src, state, cutoff);
      if (fallback.ok) {
        ok++;
        console.warn(
          `[fallback] ${src.id} - feed ${feed.error || 'unreachable'}; used ${src.fallback.kind} (${fallback.items.length} items)`,
        );
        for (const it of fallback.items) {
          inbox.push({
            kind: 'rss',
            title: it.title,
            url: it.url,
            source: src.name,
            sourceId: src.id,
            category: src.category,
            publishedAt: it.publishedAt,
            summary: it.summary,
          });
        }
        continue;
      }
      console.warn(`[skip] ${src.id} - feed ${feed.error || 'unreachable'}; fallback ${fallback.error}`);
      fail++;
      continue;
    }
    if (!xml) {
      console.warn(`[skip] ${src.id} - feed unreachable`);
      fail++;
      continue;
    }
    ok++;
    for (const it of parseItems(xml)) {
      const ts = it.published ? Date.parse(it.published) : NaN;
      if (Number.isFinite(ts) && ts < cutoff) continue;
      if (state.has(it.url)) continue;
      inbox.push({
        kind: 'rss',
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
  return { inbox, ok, fail };
}

async function ingestSocial(state: Set<string>, cutoff: number) {
  const inbox: InboxItem[] = [];
  const unreachable: string[] = [];
  let ok = 0;
  for (const h of SOCIAL_HANDLES) {
    const res = await fetchSocialFeed(h.handle);
    if (!res) {
      console.warn(`[skip] @${h.handle} — no Nitter instance returned a feed`);
      unreachable.push(h.handle);
      continue;
    }
    ok++;
    for (const it of parseItems(res.xml)) {
      const ts = it.published ? Date.parse(it.published) : NaN;
      if (Number.isFinite(ts) && ts < cutoff) continue;
      const canonical = canonicalTweetUrl(h.handle, it.url);
      if (state.has(canonical)) continue;
      const linkedUrls = extractLinks(it.rawSummary || '');
      inbox.push({
        kind: 'social',
        title: it.title || `@${h.handle}`,
        url: canonical,
        source: h.name,
        sourceId: `x:${h.handle}`,
        category: h.category,
        publishedAt: Number.isFinite(ts) ? new Date(ts).toISOString() : new Date().toISOString(),
        summary: it.summary,
        handle: h.handle,
        via: res.via,
        linkedUrls,
      });
    }
  }
  return { inbox, ok, unreachable };
}

async function ingestManualQueue(state: Set<string>) {
  const inbox: InboxItem[] = [];
  const queue = await readJSON<{ queued: SocialQueueEntry[] }>(SOCIAL_QUEUE, { queued: [] });
  const carry: SocialQueueEntry[] = [];
  let merged = 0;
  for (const q of queue.queued ?? []) {
    if (!q.url) continue;
    if (state.has(q.url)) continue;
    inbox.push({
      kind: 'social',
      title: q.note ? `(queued) ${q.note.slice(0, 80)}` : '(queued social post)',
      url: q.url,
      source: 'Manual queue',
      sourceId: 'manual',
      category: 'insights',
      publishedAt: q.addedAt || new Date().toISOString(),
      summary: q.note,
      via: 'manual',
      linkedUrls: extractLinks(q.note || ''),
    });
    merged++;
  }
  // Move processed entries to published queue (audit trail), reset queue file to empty.
  if (merged > 0) {
    const published = await readJSON<{ items: Array<SocialQueueEntry & { processedAt: string }> }>(
      SOCIAL_QUEUE_PUBLISHED,
      { items: [] },
    );
    const stamp = new Date().toISOString();
    published.items = [
      ...published.items,
      ...(queue.queued ?? []).filter((q) => q.url).map((q) => ({ ...q, processedAt: stamp })),
    ];
    await fs.writeFile(SOCIAL_QUEUE_PUBLISHED, JSON.stringify(published, null, 2));
    await fs.writeFile(SOCIAL_QUEUE, JSON.stringify({ queued: carry }, null, 2));
  }
  return { inbox, merged };
}

async function main() {
  const state = await readJSON<State>(STATE, { covered: [], lastIngest: null });
  const covered = new Set(state.covered);
  const cutoff = Date.now() - DAYS * 24 * 60 * 60 * 1000;

  const rss = await ingestRss(covered, cutoff);
  const social = await ingestSocial(covered, cutoff);
  const manual = await ingestManualQueue(covered);

  const items = [...rss.inbox, ...social.inbox, ...manual.inbox].sort(
    (a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt),
  );

  await fs.mkdir(path.dirname(INBOX), { recursive: true });
  await fs.writeFile(
    INBOX,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        socialUnreachable: social.unreachable,
        items,
      },
      null,
      2,
    ),
  );

  console.log(
    `Ingest complete. RSS: ${rss.ok} ok / ${rss.fail} fail. Social: ${social.ok} handles ok / ${social.unreachable.length} unreachable. Manual queue merged: ${manual.merged}. Total candidates: ${items.length}.`,
  );
  console.log(`Wrote ${path.relative(ROOT, INBOX)}.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
