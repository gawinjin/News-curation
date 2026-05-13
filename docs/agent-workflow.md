# Agent workflow — Signal multi-agent run

This is the playbook for Claude sessions that author articles on Signal. Read [`AGENTS.md`](../AGENTS.md) first for the editorial bar (≤25-word verbatim cap, required sections, banned phrases). This file documents **how** to do the daily run with parallel subagents.

> **Mental model.** Your session is the **Orchestrator**. It dispatches several `Agent`-tool subagents in parallel, merges their JSON outputs into a **brief** per candidate, then dispatches a Writer subagent to turn each brief into a publishable `.mdx`. Verification, commit, and push happen in the main session.

---

## 1. Overview diagram

```
                                  data/inbox.json
                                       │
                                       ▼
                            ┌──────────────────────┐
                            │   Topic-Picker        │   (orchestrator: Read + judgement)
                            │  → 1–3 candidates     │
                            └──────────┬───────────┘
                                       │
                           ┌───────────┼───────────┐    (parallel — 1 message,
                           ▼           ▼           ▼     up to 9 Agent tool calls)
                  ┌───────────────┐ ┌─────────────┐ ┌───────────────────┐
                  │ Source        │ │ Practical-  │ │ Cross-reference   │   per candidate
                  │ Researcher    │ │ Guide       │ │ Researcher        │
                  │ (Explore)     │ │ Researcher  │ │ (Explore)         │
                  │               │ │ (general)   │ │                   │
                  └───────┬───────┘ └──────┬──────┘ └─────────┬─────────┘
                          └────────────────┼─────────────────┘
                                           ▼
                              ┌────────────────────────┐
                              │   Brief Assembler       │  (orchestrator)
                              │   writes data/briefs/   │
                              │   <date>-<slug>.json    │
                              └───────────┬────────────┘
                                          │
                       ┌──────────────────┼──────────────────┐   parallel writers
                       ▼                  ▼                  ▼
                  ┌─────────┐        ┌─────────┐        ┌─────────┐
                  │ Writer  │        │ Writer  │        │ Writer  │   (general-purpose)
                  └────┬────┘        └────┬────┘        └────┬────┘
                       └──────────────────┼──────────────────┘
                                          ▼
                            ┌────────────────────────┐
                            │  Verifier (orchestrator) │
                            │  npm run verify, build   │
                            └───────────┬────────────┘
                                        │
                              commit · push · update PR
                            move briefs → data/briefs/_published/
```

---

## 2. Brief schema

`data/briefs/<YYYY-MM-DD-slug>.json` — written by the orchestrator after merging subagent outputs.

```json
{
  "slug": "claude-opus-4-7-release",
  "date": "2026-05-13",
  "category": "model-releases",
  "audience": "general",
  "title_candidates": [
    "Claude Opus 4.7 lands — what's actually different",
    "A clearer Claude: Opus 4.7"
  ],
  "summary": "≤220-char one-or-two-sentence reader-facing summary.",
  "tags": ["claude", "anthropic", "models", "how-to"],
  "primary_source": {
    "url": "https://www.anthropic.com/news/claude-opus-4-7",
    "title": "Claude Opus 4.7",
    "author": "Anthropic",
    "publishedAt": "2026-05-13",
    "key_facts": [
      "Paraphrased fact 1 (in our voice, NOT verbatim).",
      "Paraphrased fact 2."
    ],
    "quote_candidates": [
      {
        "text": "≤25-word exact quote from the source.",
        "words": 12,
        "exact": true,
        "position": "release notes paragraph 2"
      }
    ]
  },
  "supporting_sources": [
    {
      "url": "https://...",
      "title": "Companion docs",
      "key_facts": ["..."],
      "quote_candidates": []
    }
  ],
  "practical_guide": {
    "timeToTry": "5 min",
    "prerequisites": ["A free Claude.ai account", "A browser"],
    "steps": [
      { "instruction": "Open claude.ai and sign in", "verify_url": "https://claude.ai" },
      { "instruction": "Pick Opus 4.7 from the model picker", "verify_url": "https://www.anthropic.com/news/claude-opus-4-7" }
    ]
  },
  "references": [
    {
      "title": "Claude Opus 4.7 release notes",
      "url": "https://www.anthropic.com/news/claude-opus-4-7",
      "author": "Anthropic",
      "publishedAt": "2026-05-13"
    }
  ],
  "social": [],
  "tweet_is_primary": false,
  "risk_flags": [
    "Quote #2 was 27 words — trimmed to 24.",
    "Could not reach https://example.com/X — skipped."
  ],
  "assembled_at": "2026-05-13T10:00:00Z",
  "assembled_by": "Signal Orchestrator v1"
}
```

### Field rules

- **slug**: kebab-case, no date prefix (the script adds it).
- **category**: one of `model-releases`, `research`, `insights`, `guides`.
- **key_facts**: paraphrased, not pasted. The Writer composes the body from these.
- **quote_candidates[].text**: must be ≤ 25 words; verify-article will fail builds that exceed it.
- **practical_guide.steps**: 3–6 numbered steps a normal user can follow in the stated `timeToTry`. Each step that touches a URL gets a `verify_url`.
- **references**: at least one. The Writer copies these straight into frontmatter.
- **social**: present only when the candidate is a tweet (see § Social candidates).

---

## 3. Subagent prompts (copy-paste ready)

Each prompt is self-contained — the subagent has no prior context. The orchestrator inserts the candidate URL/topic before dispatching.

### 3a. Source Researcher

Dispatch with `subagent_type: Explore`.

> You are researching ONE primary source for an article on the Signal news site (audience: curious general users).
>
> **Primary source URL:** `<INSERT_URL>`
>
> **What to do:**
> 1. Fetch the page (`WebFetch`) and read it carefully.
> 2. Paraphrase the most reader-useful facts in our own voice.
> 3. Extract up to 4 verbatim quote candidates of ≤ 25 words each, preserving exact wording.
>
> **Hard rules:**
> - Do not invent facts. If something isn't on the page, leave it out.
> - Paraphrases must not contain any run of more than 25 consecutive words from the source.
> - Quote candidates must be quoted text from the page, with word count ≤ 25.
>
> **Output STRICT JSON only, no prose:**
> ```json
> {
>   "title": "...",
>   "author": "...",
>   "publishedAt": "YYYY-MM-DD or null",
>   "key_facts": ["≤ 8 strings"],
>   "quote_candidates": [{ "text": "...", "words": N, "exact": true, "position": "where in the doc" }]
> }
> ```
> If the page is unreachable, return `{ "error": "unreachable" }`.

### 3b. Practical-Guide Researcher

Dispatch with `subagent_type: general-purpose` (needs WebFetch + browsing).

> You are designing the "Practical Guide" section for a Signal article. The audience is a curious general user — not a developer.
>
> **Source URL:** `<INSERT_URL>`
> **Topic:** `<ONE-SENTENCE_TOPIC>`
>
> **What to do:**
> 1. Find how a normal user can actually try the thing. Look for sign-up pages, getting-started docs, in-product UI hints.
> 2. Draft 3–6 numbered steps. Every step must be testable: name the button, the URL, what they'll see.
> 3. State realistic time-to-try (e.g. "5 min", "15 min", "30 min").
> 4. List concrete prerequisites (account, hardware, OS — be specific).
>
> **Hard rules:**
> - No "explore the possibilities" filler. Every step is a verb + object + outcome.
> - If you cannot find concrete steps a normal user can follow today, return `{ "skip": true, "reason": "..." }` — do not invent steps.
>
> **Output STRICT JSON only:**
> ```json
> {
>   "timeToTry": "X min",
>   "prerequisites": ["..."],
>   "steps": [{ "instruction": "...", "verify_url": "https://..." }]
> }
> ```

### 3c. Cross-reference Researcher

Dispatch with `subagent_type: Explore`.

> You are gathering supporting references for a Signal article.
>
> **Primary source URL:** `<INSERT_URL>`
> **Topic:** `<ONE-SENTENCE_TOPIC>`
>
> **What to do:**
> Find 1–3 supporting sources that add useful context. Prefer:
> - Companion pages from the same publisher (e.g., release notes + docs + announcement).
> - Sources on Signal's allowed list (see `src/lib/sources.ts` and `src/lib/social-sources.ts`).
> - Official documentation linked from the primary source.
>
> Do not include opinion pieces unrelated to the topic. Do not include paywalled pages.
>
> **Output STRICT JSON only:**
> ```json
> [
>   { "url": "...", "title": "...", "one_line_note": "Why this matters here." }
> ]
> ```

### 3d. Writer

Dispatch with `subagent_type: general-purpose` (needs Read, Edit, Bash).

> You are writing the prose for a Signal article. Read [`../AGENTS.md`](../AGENTS.md) for tone and the editorial bar. Do not commit; the orchestrator will do that.
>
> **Brief:** `data/briefs/<INSERT_BRIEF_FILENAME>`
>
> **Steps:**
> 1. Read the brief.
> 2. Run `npm run brief-to-mdx -- data/briefs/<INSERT_BRIEF_FILENAME>`. This creates an `.mdx` in `src/content/articles/` with frontmatter, the practical guide, and section placeholders.
> 3. Open the generated `.mdx`. Replace the three prose placeholders:
>    - `## TL;DR` — one paragraph, ≤ 60 words. Lead with the concrete thing.
>    - `## What's New` — 2–3 short paragraphs of facts, sourced from `key_facts`. Paraphrase.
>    - `## Why It Matters` — 1–2 paragraphs connecting the news to a normal reader's day.
> 4. If you quote, copy a `quote_candidates` entry exactly, in quotation marks, with the source linked inline.
> 5. Run `npm run verify`. If it fails, fix the failures and rerun. If verify still fails after two attempts, leave a `risk_flag` comment at the top of the brief and stop.
>
> **Hard rules:**
> - Use only facts present in the brief.
> - Banned phrases: "delve", "tapestry", "groundbreaking", "revolutionary", "in the realm of", "unlock", "explore the possibilities".
> - Do not add references or social entries that aren't in the brief.
> - Do not commit. Do not push.
>
> **Output:** path to the saved `.mdx` and a 1-line note about what (if anything) needed fixing.

---

## 4. Topic-Picker rules (orchestrator does this — not a subagent)

After `npm run ingest`, `data/inbox.json` looks like:

```json
{
  "generatedAt": "...",
  "socialUnreachable": ["karpathy", "..."],
  "items": [
    { "kind": "rss",    "title": "...", "url": "...", "source": "...", "category": "...", "publishedAt": "...", "summary": "..." },
    { "kind": "social", "title": "...", "url": "https://x.com/karpathy/status/...", "handle": "karpathy", "via": "nitter.privacydev.net", "linkedUrls": ["https://arxiv.org/..."], "summary": "tweet body" }
  ]
}
```

Pick 1–3 candidates that satisfy ALL of:

1. **New** — URL is not in `data/state.json`.
2. **High-signal for general users** — model release, named voice, paper that has practical takeaways, or a tool a normal person can try.
3. **Actionable** — you can imagine a real `<PracticalGuide>` step list (5–30 min).
4. **(Tweets only) Has a linked URL** — `kind === "social"` items must have `linkedUrls.length > 0`. The first linked URL becomes the **primary source**; the tweet becomes a `social[]` entry. Pure-opinion tweets are skipped.

If fewer than 1 candidate qualifies, **do not publish**. Note "No high-signal candidates today — skipping." in the PR description and stop. Silence beats slop.

---

## 5. Social (X / Nitter) candidates

When a candidate has `kind: "social"`:

1. **Source Researcher** runs against `linkedUrls[0]`, not the tweet URL. The tweet is incidental — the linked thing is the substance.
2. The brief's `social[]` array gets a single entry:
   ```json
   { "author": "@<handle>", "url": "<tweet_url>", "platform": "x", "postedAt": "<publishedAt>" }
   ```
3. If you want to quote the tweet body, use the same ≤25-word cap and quote it in the Writer's "What's New" section with an inline link to the tweet.
4. **Edge case** — `tweet_is_primary: true` is allowed only when the tweet text itself is the noteworthy substance (rare; the linked URL is just a doc index, or the tweet contains an original quote). In that case the tweet URL ALSO goes into `references[]` and the Writer phrases the article around the tweet directly.

When `socialUnreachable` is non-empty, that means all Nitter mirrors failed for those handles. You can still drop URLs into `data/social-queue.json` between runs; the next ingest will pick them up.

---

## 6. Example dispatch (2 candidates)

After ingest, suppose the Topic-Picker chose:

- Candidate A: `https://www.anthropic.com/news/claude-opus-4-7` (slug `claude-opus-4-7-release`, category `model-releases`)
- Candidate B: `https://x.com/karpathy/status/...` → linked `https://arxiv.org/abs/2510.12345` (slug `karpathy-recommends-paper`, category `research`)

The orchestrator opens **6 Agent calls in one message**:

```ts
Agent({ subagent_type: 'Explore',         description: 'Source A',        prompt: SOURCE_RESEARCHER_PROMPT(A_URL) })
Agent({ subagent_type: 'general-purpose', description: 'Practical A',     prompt: PRACTICAL_GUIDE_PROMPT(A_URL, A_TOPIC) })
Agent({ subagent_type: 'Explore',         description: 'Cross-ref A',     prompt: CROSS_REF_PROMPT(A_URL, A_TOPIC) })
Agent({ subagent_type: 'Explore',         description: 'Source B',        prompt: SOURCE_RESEARCHER_PROMPT(B_LINKED_URL) })
Agent({ subagent_type: 'general-purpose', description: 'Practical B',     prompt: PRACTICAL_GUIDE_PROMPT(B_LINKED_URL, B_TOPIC) })
Agent({ subagent_type: 'Explore',         description: 'Cross-ref B',     prompt: CROSS_REF_PROMPT(B_LINKED_URL, B_TOPIC) })
```

When all 6 return, the orchestrator writes `data/briefs/2026-05-13-claude-opus-4-7-release.json` and `data/briefs/2026-05-13-karpathy-recommends-paper.json` (the second's brief includes the tweet in `social[]`).

Then **2 Writer calls in one message**:

```ts
Agent({ subagent_type: 'general-purpose', description: 'Write A', prompt: WRITER_PROMPT('2026-05-13-claude-opus-4-7-release.json') })
Agent({ subagent_type: 'general-purpose', description: 'Write B', prompt: WRITER_PROMPT('2026-05-13-karpathy-recommends-paper.json') })
```

Orchestrator then runs `npm run verify && npm run build`, fixes anything that broke, moves both briefs to `data/briefs/_published/`, appends the cited URLs to `data/state.json`, commits, and pushes.

---

## 7. Failure modes & what to do

| Symptom | Action |
| --- | --- |
| Source Researcher returns `{ "error": "unreachable" }` | Drop that candidate. Note it in the PR description. Continue with the others. |
| Practical-Guide Researcher returns `{ "skip": true, ... }` | Drop that candidate — no Practical Guide = no article. |
| Cross-ref returns `[]` | OK. The article can ship with one reference (the primary). |
| Two researchers report conflicting facts | Trust the primary source. Add a `risk_flag` and proceed. |
| Writer's `npm run verify` fails on >25-word verbatim | Re-paraphrase the offending paragraph. Don't tweak the quote cap. |
| Writer's verify fails twice | Park the brief in `data/briefs/_stuck/` with a note. Skip the article for today. |
| All Nitter instances down | `socialUnreachable` populates. RSS candidates still work. Drop URLs into `data/social-queue.json` manually if you have them. |
| Conflict with `data/state.json` (URL already covered) | Drop the candidate. Move on. |
| No qualifying candidates | Don't publish. Update the PR description with "No high-signal candidates today — skipping." Stop. |

---

## 8. Token-budget guidance

To keep runs cheap and fast:

- Cap each researcher to **3 fetched pages** max.
- Writer prose total ≤ **600 words** (TL;DR + What's New + Why It Matters). Practical Guide steps come from the brief — no extra writing needed.
- Brief JSON for a single article should comfortably fit under 3 KB.
- One full daily run (3 candidates × 3 researchers + 3 writers + verify) should take well under 5 minutes of agent time.

---

## 9. What's hard-coded vs. tunable

| Hard-coded | Tunable (via env or `src/lib/`) |
| --- | --- |
| ≤ 25-word verbatim cap | `NITTER_INSTANCES` env var |
| 5 required sections | Source list in `src/lib/sources.ts` |
| Banned phrases | Social handle list in `src/lib/social-sources.ts` |
| The brief schema | Topic-Picker thresholds (in your judgement) |
| `data/state.json` dedup behavior | Token-budget caps above |

Changes to the hard-coded items require human approval (see `AGENTS.md` → "Things you should not change without asking").
