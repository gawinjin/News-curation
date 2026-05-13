// Scaffolds a new draft article at src/content/articles/<YYYY-MM-DD-slug>.md
// Usage: npm run new-article -- <slug> [--category model-releases|research|insights|guides]

import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve(new URL('..', import.meta.url).pathname);
const ARTICLES_DIR = path.join(ROOT, 'src', 'content', 'articles');

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

const positional = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const slugInput = positional[0];
const category = arg('category') || 'model-releases';

if (!slugInput) {
  console.error('Usage: npm run new-article -- <slug> [--category model-releases|research|insights|guides]');
  process.exit(1);
}

const slug = slugInput
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/(^-|-$)/g, '');

const today = new Date().toISOString().slice(0, 10);
const filename = `${today}-${slug}.mdx`;
const filepath = path.join(ARTICLES_DIR, filename);

const template = `---
title: "REPLACE — short, specific, no clickbait"
date: ${today}
category: ${category}
tags: ["replace-me", "ai"]
summary: "One or two sentences (≤220 chars) describing what's new and why a reader should care."
audience: general
featured: false
practicalGuide:
  timeToTry: "10 min"
  prerequisites:
    - "An internet connection"
references:
  - title: "Primary source title"
    url: "https://example.com/source"
    author: "Author or Org"
    publishedAt: "${today}"
# social:
#   - author: "Andrej Karpathy"
#     url: "https://x.com/karpathy/status/..."
#     platform: x
#     postedAt: "${today}"
# heroEmbed:
#   type: youtube
#   src: "https://www.youtube.com/watch?v=..."
#   alt: "Talk: ..."
draft: true
---

## TL;DR

One paragraph (≤60 words). Lead with the concrete thing: what was released or said, who it's from, and what changes for a normal user.

## What's New

Two or three short paragraphs of facts. Paraphrase — do not copy. If you must quote, ≤25 words in quotation marks with an inline link to the source.

## Why It Matters

Connect the news to what a curious reader actually does day-to-day. Be concrete. Avoid hype.

<PracticalGuide timeToTry="10 min" prerequisites={["An internet connection"]}>

1. First step — what to open, where to click.
2. Second step — what to type or paste.
3. Third step — what to expect.
4. Variation: try this prompt or setting next.

</PracticalGuide>
`;

async function main() {
  await fs.mkdir(ARTICLES_DIR, { recursive: true });
  try {
    await fs.access(filepath);
    console.error(`Refusing to overwrite existing file: ${path.relative(ROOT, filepath)}`);
    process.exit(2);
  } catch {
    /* not found — good */
  }
  await fs.writeFile(filepath, template);
  console.log(`Created ${path.relative(ROOT, filepath)} (draft: true — flip to false to publish).`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
