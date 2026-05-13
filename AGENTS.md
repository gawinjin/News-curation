# AGENTS.md — Signal handoff doc

You are the next agent maintaining **Signal**, an AI-curated news site for curious general users. The site is the product; you are the recurring author. Every run, read this file first, then follow the run checklist at the bottom.

---

## The bar

Every article must:

1. Be **rewritten in our own voice** — never copy-paste source text.
2. Use direct quotes of **≤ 25 consecutive words**, in quotation marks, with an inline link to the source.
3. Cite **≥ 1 reference** in frontmatter (almost always 2–4 is right).
4. End with a **`<PracticalGuide>`** block that a normal user can follow in the stated time.
5. Pass `npm run verify` and `npm run build`.

Articles fail the verify script if they:
- Lack the required sections (`## TL;DR`, `## What's New`, `## Why It Matters`, `<PracticalGuide …>`).
- Lack references in frontmatter.
- Contain any verbatim run of > 25 words from a reachable reference URL.

If you can't get a draft past `verify`, don't ship it. Silence beats slop.

---

## Audience

Curious general users — not engineers, not researchers. People who heard about ChatGPT/Claude and want to understand what's happening and how to use it.

- Lead with the concrete thing, not the framing.
- No jargon without a one-line explanation.
- Avoid hype words: "groundbreaking", "revolutionary", "delve", "tapestry", "in the realm of", "unlock".
- Practical Guide steps must be testable. "Sign up at X.com / paste Y / look for Z." Not "explore the possibilities".

---

## Allowed sources

The full list lives in [`src/lib/sources.ts`](src/lib/sources.ts). Summary:

**Labs (RSS):** Anthropic, OpenAI, Google DeepMind, Meta AI, Mistral, Hugging Face.
**Voices (RSS):** Andrej Karpathy, Simon Willison, Jack Clark (Import AI), Lilian Weng, Sebastian Raschka.
**Social posts:** Only when the user supplies the URL and author. Treat them like any other source — quote ≤ 25 words, link the original, add to frontmatter `social: [...]`.

If a source isn't in `sources.ts` and isn't a user-supplied social URL, you may still **link** to it as a reference, but pull facts from sources you trust. Never paraphrase a website you can't open or whose terms you haven't checked.

---

## Article template

Files live in `src/content/articles/` as `<YYYY-MM-DD-slug>.mdx`. The `new-article` script scaffolds one with the right shape:

```
npm run new-article -- claude-opus-4-7-release --category model-releases
```

Required body sections, in order:
1. `## TL;DR` — one paragraph, ≤ 60 words.
2. `## What's New` — 2–3 short paragraphs of facts.
3. `## Why It Matters` — connect to real reader behavior.
4. `<PracticalGuide timeToTry="…" prerequisites={["…"]}>` — ordered list of steps.

References render automatically from frontmatter; **do not write a References section in the body.**

Frontmatter schema is enforced by Zod ([`src/content/config.ts`](src/content/config.ts)).

---

## Categories

| Slug | When to use |
| --- | --- |
| `model-releases` | New models or significant version bumps |
| `research` | Notable papers / lab findings |
| `insights` | Essays, talks, or posts from named voices |
| `guides` | Standalone how-tos and tool roundups |

---

## Dedup

`data/state.json` lists every source URL we've already covered. The ingest script filters it out automatically. **After publishing**, append the source URLs you cited to `data/state.json` so future runs don't re-cover them.

---

## Run checklist (every session)

1. `git pull origin claude/ai-news-platform-XeTXH` (or the current dev branch).
2. `npm install` if `node_modules` is missing.
3. `npm run ingest` — refreshes `data/inbox.json` with the last 7 days of items not yet covered.
4. Open `data/inbox.json` and pick **1–3 candidates**. Criteria:
   - Genuinely new (not already in `state.json`).
   - High-signal for general users (model release, named voice, or a tool a normal person can try).
   - You can write a real `<PracticalGuide>` step list for it (5 min to 30 min). If you can't, skip.
5. For each pick: `npm run new-article -- <slug> --category <slug>`.
6. Write the article. Stay inside the rules above.
7. `npm run verify` until it passes.
8. `npm run build` — must succeed.
9. Append the cited URLs to `data/state.json` under `covered`, and update `lastIngest` to the current ISO timestamp.
10. `git add -A && git commit -m "add: <slug>"`.
11. `git push -u origin <branch>`.
12. Open or update a **draft PR** on GitHub.

If there is no good candidate today: don't publish. Leave a one-line note in the PR description ("No high-signal candidates today — skipping.") and stop.

---

## Commit author

This repo is authored as **Gawin J <gawinjin@gmail.com>** (set with `git config user.name/email` in this clone only). Don't change it. If you start in a fresh clone, set it again:

```
git config user.name "Gawin J"
git config user.email "gawinjin@gmail.com"
```

---

## Things you can change

- Add new sources to `src/lib/sources.ts` (RSS only; verify the feed is publicly licensed for redistribution).
- Tweak components for clarity — keep the visual hierarchy editorial.
- Improve `scripts/verify-article.ts` (e.g., catch more verbatim variants).

## Things you should not change without asking the human

- The 25-word verbatim cap or the rule against missing references.
- The required body sections.
- The audience or tone.
- Anything in `data/state.json` other than appending entries.
