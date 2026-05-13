# Signal

AI news, made useful. A static site (Astro + Markdown) that turns the latest AI releases, research, and ideas into clear writeups with a practical guide at the end.

→ **Editorial rules & agent handoff:** see [`AGENTS.md`](AGENTS.md).

---

## Stack

- **Astro 4** + `@astrojs/mdx` + content collections (Zod-validated frontmatter)
- **Tailwind CSS** with light/dark theming
- **Pagefind** for client-side full-text search (built at build time)
- **Buttondown** for newsletter signups (form posts to public embed endpoint)
- **Cloudflare Pages** for hosting

---

## Local dev

```bash
npm install
npm run dev          # http://localhost:4321
```

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Astro dev server |
| `npm run build` | Build to `dist/` and generate the Pagefind search index |
| `npm run preview` | Preview the built site locally |
| `npm run ingest` | Pull recent items from RSS sources → `data/inbox.json` |
| `npm run verify` | Lint every article (schema, sections, plagiarism). Run before commit. |
| `npm run new-article -- <slug> --category <c>` | Scaffold a new draft `.mdx` file |

Verify-article can run offline:

```bash
VERIFY_FETCH=0 npm run verify   # skip the plagiarism HTTP fetch
```

## Adding an article

```bash
npm run new-article -- some-new-thing --category model-releases
# edit src/content/articles/<date>-some-new-thing.mdx
# flip `draft: true` to `false` when it's ready
npm run verify
npm run build
```

The required body sections are `## TL;DR`, `## What's New`, `## Why It Matters`, and a `<PracticalGuide>` block. References go in frontmatter and render automatically.

## Deploying to Cloudflare Pages

1. Push the repo to GitHub.
2. In Cloudflare Pages, **Create a project → Connect to Git**, pick this repo.
3. Build settings:
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
   - **Node version:** `20` (set in env vars: `NODE_VERSION=20`)
4. Set environment variable `PUBLIC_BUTTONDOWN_USERNAME` to your Buttondown handle (optional — without it the form renders disabled).
5. First deploy goes to `signal.pages.dev`. To attach a custom domain later: **Pages → Custom domains → Set up a custom domain**.

## Project layout

```
src/
  content/articles/    Markdown/MDX articles (each is one file)
  content/config.ts    Zod schema for frontmatter
  components/          UI primitives (Header, Footer, PracticalGuide, …)
  layouts/             Base + Article layouts
  pages/               Routes — index, articles, category, tag, archive, rss, search
  lib/                 categories, sources, site, readingTime
  styles/global.css    CSS variables + editorial typography
scripts/
  ingest.ts            RSS → data/inbox.json
  verify-article.ts    Lint + plagiarism check (fails CI on violation)
  new-article.ts       Scaffold a draft .mdx file
data/
  state.json           Covered URLs (dedup memory)
  inbox.json           Latest RSS items, refreshed by ingest
public/                Static assets
.github/workflows/     verify.yml runs on every push
AGENTS.md              The rules for any agent that maintains this site
```

## License

Code: MIT. Articles: © Signal, all rights reserved. Quotes from sources are used under fair-use limits (≤ 25 verbatim words, with citation) — see [`/about`](https://signal.pages.dev/about).
