// Converts a research brief (data/briefs/<file>.json) into a scaffolded .mdx
// in src/content/articles/. Frontmatter and the Practical Guide are filled in
// from the brief; the three prose sections (TL;DR / What's New / Why It Matters)
// are left as placeholders for the Writer subagent.
//
// Usage:  npm run brief-to-mdx -- data/briefs/2026-05-13-claude-opus-4-7-release.json
//         npm run brief-to-mdx -- data/briefs/<file>.json --out /tmp/preview.mdx   (dry-run path)

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ARTICLES_DIR = path.join(ROOT, 'src', 'content', 'articles');

type Brief = {
  slug: string;
  date: string;
  category: 'model-releases' | 'research' | 'insights' | 'guides';
  audience?: 'general' | 'developer';
  title_candidates: string[];
  summary: string;
  tags: string[];
  primary_source: { url: string; title: string; author?: string; publishedAt?: string };
  supporting_sources?: Array<{ url: string; title: string }>;
  practical_guide: {
    timeToTry: string;
    prerequisites: string[];
    steps: Array<{ instruction: string; verify_url?: string }>;
  };
  references: Array<{ title: string; url: string; author?: string; publishedAt?: string }>;
  social?: Array<{ author: string; url: string; platform: string; postedAt?: string }>;
  tweet_is_primary?: boolean;
  featured?: boolean;
};

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

function escapeYamlString(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function yamlList(items: string[], indent = 2): string {
  if (!items.length) return '[]';
  return (
    '\n' + items.map((it) => `${' '.repeat(indent)}- "${escapeYamlString(it)}"`).join('\n')
  );
}

function frontmatter(b: Brief): string {
  const title = b.title_candidates[0];
  const refs = b.references
    .map((r) => {
      const parts = [
        `  - title: "${escapeYamlString(r.title)}"`,
        `    url: "${r.url}"`,
      ];
      if (r.author) parts.push(`    author: "${escapeYamlString(r.author)}"`);
      if (r.publishedAt) parts.push(`    publishedAt: "${r.publishedAt}"`);
      return parts.join('\n');
    })
    .join('\n');
  const social = (b.social ?? [])
    .map((s) => {
      const parts = [
        `  - author: "${escapeYamlString(s.author)}"`,
        `    url: "${s.url}"`,
        `    platform: ${s.platform}`,
      ];
      if (s.postedAt) parts.push(`    postedAt: "${s.postedAt}"`);
      return parts.join('\n');
    })
    .join('\n');

  let fm = `---
title: "${escapeYamlString(title)}"
date: ${b.date}
category: ${b.category}
tags: [${b.tags.map((t) => `"${escapeYamlString(t)}"`).join(', ')}]
summary: "${escapeYamlString(b.summary)}"
audience: ${b.audience ?? 'general'}
featured: ${b.featured ? 'true' : 'false'}
practicalGuide:
  timeToTry: "${escapeYamlString(b.practical_guide.timeToTry)}"
  prerequisites:${yamlList(b.practical_guide.prerequisites, 4)}
references:
${refs}`;
  if (social) {
    fm += `\nsocial:\n${social}`;
  }
  fm += `\ndraft: false\n---\n`;
  return fm;
}

function practicalGuideBlock(b: Brief): string {
  const prereqJson = JSON.stringify(b.practical_guide.prerequisites);
  const steps = b.practical_guide.steps
    .map((s, i) => `${i + 1}. ${s.instruction}`)
    .join('\n');
  return `<PracticalGuide timeToTry="${escapeYamlString(
    b.practical_guide.timeToTry,
  )}" prerequisites={${prereqJson}}>

${steps}

</PracticalGuide>`;
}

function body(b: Brief): string {
  const fact = b.primary_source.key_facts?.[0] || 'TODO: lead with the concrete thing.';
  return `
## TL;DR

<!-- Writer: ≤60 words. Lead with the concrete thing. Draw from key_facts in the brief. -->
TODO_TLDR

## What's New

<!-- Writer: 2–3 short paragraphs of facts. Paraphrase key_facts; do not paste raw source text. -->
<!-- Quotes (if any) must be ≤25 words, in quotation marks, with an inline link to the source. -->
TODO_WHATS_NEW

## Why It Matters

<!-- Writer: 1–2 paragraphs connecting the news to a normal reader's day. Avoid hype. -->
TODO_WHY_IT_MATTERS

${practicalGuideBlock(b)}
`;
}

async function main() {
  const positional = process.argv.slice(2).filter((a) => !a.startsWith('--'));
  const briefPath = positional[0];
  if (!briefPath) {
    console.error('Usage: npm run brief-to-mdx -- <path-to-brief.json> [--out <path>]');
    process.exit(1);
  }

  const abs = path.isAbsolute(briefPath) ? briefPath : path.join(ROOT, briefPath);
  const brief = JSON.parse(await fs.readFile(abs, 'utf8')) as Brief;

  // Minimal sanity checks (full schema lives in src/content/config.ts at build time)
  const required = ['slug', 'date', 'category', 'title_candidates', 'summary', 'tags', 'primary_source', 'practical_guide', 'references'] as const;
  for (const k of required) {
    if ((brief as any)[k] == null) {
      console.error(`Brief is missing required field: ${k}`);
      process.exit(2);
    }
  }
  if (!brief.title_candidates.length) {
    console.error('Brief.title_candidates must have at least one entry.');
    process.exit(2);
  }
  if (!brief.references.length) {
    console.error('Brief.references must have at least one entry.');
    process.exit(2);
  }
  if (!brief.practical_guide.steps?.length) {
    console.error('Brief.practical_guide.steps must have at least one step.');
    process.exit(2);
  }

  const filename = `${brief.date}-${brief.slug}.mdx`;
  const out = arg('out') ?? path.join(ARTICLES_DIR, filename);
  const absOut = path.isAbsolute(out) ? out : path.join(ROOT, out);

  await fs.mkdir(path.dirname(absOut), { recursive: true });
  try {
    await fs.access(absOut);
    if (!arg('out')) {
      console.error(`Refusing to overwrite existing file: ${path.relative(ROOT, absOut)}`);
      process.exit(3);
    }
  } catch {
    /* not present — good */
  }

  const mdx = frontmatter(brief) + body(brief);
  await fs.writeFile(absOut, mdx);
  console.log(`Wrote ${path.relative(ROOT, absOut)}`);
  console.log(`Next: Writer fills the three TODO_* placeholders, then runs \`npm run verify\`.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
