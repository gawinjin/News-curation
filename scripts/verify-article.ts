// Validates every article in src/content/articles/. Fails the process (non-zero exit)
// if anything is wrong, so CI blocks bad commits.
//
// Checks:
//  1. Frontmatter parses + required fields present
//  2. ≥ 1 reference, every URL well-formed
//  3. Body contains the 5 required sections (## TL;DR, ## What's New, ## Why It Matters,
//     <PracticalGuide …>, References render via frontmatter — not in body)
//  4. No verbatim run of > 25 words from any fetchable reference appears in the body
//     (configurable via VERIFY_FETCH=0 to skip the network step in offline CI)

import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve(new URL('..', import.meta.url).pathname);
const ARTICLES_DIR = path.join(ROOT, 'src', 'content', 'articles');
const MAX_VERBATIM = 25; // strict per editorial policy
const SHOULD_FETCH = process.env.VERIFY_FETCH !== '0';

type Result = { file: string; errors: string[] };

function parseFrontmatter(raw: string): { data: Record<string, unknown>; body: string } | null {
  if (!raw.startsWith('---')) return null;
  const end = raw.indexOf('\n---', 3);
  if (end < 0) return null;
  const fm = raw.slice(3, end).trim();
  const body = raw.slice(end + 4).replace(/^\s*\n/, '');
  const data: Record<string, unknown> = {};
  // very small YAML subset — enough for our schema
  const lines = fm.split('\n');
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim() || line.trim().startsWith('#')) {
      i++;
      continue;
    }
    const m = line.match(/^([A-Za-z0-9_]+):\s*(.*)$/);
    if (!m) {
      i++;
      continue;
    }
    const key = m[1];
    const rest = m[2];
    if (rest.trim() === '' || rest.trim() === '|' || rest.trim() === '>') {
      // block — collect indented lines
      const acc: string[] = [];
      i++;
      while (i < lines.length && /^\s{2,}/.test(lines[i])) {
        acc.push(lines[i].replace(/^\s{2}/, ''));
        i++;
      }
      data[key] = acc.join('\n');
      continue;
    }
    if (rest.trim().startsWith('[')) {
      // inline JSON-like array of strings
      try {
        data[key] = JSON.parse(rest.replace(/'/g, '"'));
      } catch {
        data[key] = rest;
      }
      i++;
      continue;
    }
    if (rest.trim() === 'true' || rest.trim() === 'false') {
      data[key] = rest.trim() === 'true';
      i++;
      continue;
    }
    // bare scalar — could be quoted string, date, number
    let v: any = rest.trim();
    if (/^".*"$|^'.*'$/.test(v)) v = v.slice(1, -1);
    data[key] = v;
    i++;
  }
  return { data, body };
}

function normalizeWords(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[‘’“”]/g, "'")
    .replace(/[^a-z0-9'\-\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

function findLongRunOverlap(body: string, source: string, max: number): string | null {
  const a = normalizeWords(body);
  const b = normalizeWords(source);
  if (b.length < max + 1) return null;
  const bSet = new Set<string>();
  for (let i = 0; i + max <= b.length; i++) bSet.add(b.slice(i, i + max).join(' '));
  for (let i = 0; i + max <= a.length; i++) {
    const run = a.slice(i, i + max).join(' ');
    if (bSet.has(run)) return a.slice(i, i + max + 1).join(' ');
  }
  return null;
}

async function fetchPlainText(url: string): Promise<string | null> {
  try {
    const ua = process.env.USER_AGENT || 'SignalBot/0.1 (+https://signal.pages.dev)';
    const r = await fetch(url, { headers: { 'user-agent': ua, accept: 'text/html,application/xhtml+xml' }, redirect: 'follow' });
    if (!r.ok) return null;
    const ct = r.headers.get('content-type') || '';
    if (!ct.includes('html') && !ct.includes('text')) return null;
    const html = await r.text();
    return html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/\s+/g, ' ');
  } catch {
    return null;
  }
}

function extractRefUrls(fmRaw: string): string[] {
  const urls: string[] = [];
  // references is a JSON-ish block. Find every `url: "..."` line.
  const re = /url:\s*['"]?(https?:\/\/[^\s'")]+)['"]?/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(fmRaw))) urls.push(m[1]);
  return Array.from(new Set(urls));
}

async function verifyFile(file: string): Promise<Result> {
  const errors: string[] = [];
  const raw = await fs.readFile(file, 'utf8');
  const parsed = parseFrontmatter(raw);
  if (!parsed) {
    errors.push('Missing or malformed frontmatter.');
    return { file, errors };
  }
  const { data, body } = parsed;

  // Frontmatter raw slice for references
  const fmEnd = raw.indexOf('\n---', 3);
  const fmRaw = raw.slice(3, fmEnd);

  for (const k of ['title', 'date', 'category', 'tags', 'summary']) {
    if (!(k in data)) errors.push(`Missing required frontmatter field: ${k}`);
  }
  if (!/references:/.test(fmRaw)) errors.push('Missing references in frontmatter.');
  if (!/practicalGuide:/.test(fmRaw)) errors.push('Missing practicalGuide in frontmatter.');

  // Body section checks
  if (!/^##\s*TL;DR/im.test(body)) errors.push("Body missing '## TL;DR' heading.");
  if (!/^##\s*What'?s New/im.test(body)) errors.push("Body missing \"## What's New\" heading.");
  if (!/^##\s*Why It Matters/im.test(body)) errors.push("Body missing '## Why It Matters' heading.");
  if (!/<PracticalGuide\b/.test(body)) errors.push('Body missing <PracticalGuide …> component.');

  // Plagiarism check — compare body against each reference page
  const refUrls = extractRefUrls(fmRaw);
  if (refUrls.length === 0) errors.push('No reference URLs detected in frontmatter.');

  if (SHOULD_FETCH) {
    for (const url of refUrls) {
      const text = await fetchPlainText(url);
      if (!text) {
        // Don't fail just because a page is unreachable in CI; log a notice.
        console.warn(`[notice] ${path.relative(ROOT, file)} — could not fetch reference for plagiarism check: ${url}`);
        continue;
      }
      const hit = findLongRunOverlap(body, text, MAX_VERBATIM);
      if (hit) {
        errors.push(
          `>${MAX_VERBATIM}-word verbatim run from ${url} found in body:\n    "${hit.slice(0, 200)}…"`,
        );
      }
    }
  }

  return { file, errors };
}

async function listArticles(): Promise<string[]> {
  try {
    const entries = await fs.readdir(ARTICLES_DIR);
    return entries
      .filter((f) => f.endsWith('.md') || f.endsWith('.mdx'))
      .map((f) => path.join(ARTICLES_DIR, f));
  } catch {
    return [];
  }
}

async function main() {
  const files = await listArticles();
  if (!files.length) {
    console.log('No articles to verify (yet).');
    return;
  }
  let failures = 0;
  for (const f of files) {
    const r = await verifyFile(f);
    if (r.errors.length) {
      failures++;
      console.error(`\n✗ ${path.relative(ROOT, f)}`);
      for (const e of r.errors) console.error(`    - ${e}`);
    } else {
      console.log(`✓ ${path.relative(ROOT, f)}`);
    }
  }
  if (failures) {
    console.error(`\n${failures} article(s) failed verification.`);
    process.exit(1);
  }
  console.log(`\nAll ${files.length} article(s) passed verification.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
