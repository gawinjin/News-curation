# Review Note — Hazards, Flaws & Dirty-Worktree (News-curation / "Signal")

> Status: **review only — no code changed.** This note records findings from a
> code-graph review of the editorial pipeline and git hygiene. Each item has a
> severity and a proposed fix. An implementing agent should treat this as the
> source of truth and confirm the open decisions (marked **DECIDE**) before coding.

Reviewed on branch `claude/happy-davinci-oXH8l`. A divergent branch
`claude/ai-news-platform-XeTXH` also exists (see A3).

---

## A. Dirty worktree / git hygiene

**A1 — `data/inbox.json` is tracked but fully regenerated. (HIGH)**
`scripts/ingest.ts:389-401` overwrites `data/inbox.json` every run; it is a pure
derived artifact yet `git ls-files data/` shows it tracked. Every `npm run ingest`
dirties the tree and invites noisy/accidental commits.
Fix: `git rm --cached data/inbox.json`; add it to `.gitignore`. Keep
`data/state.json` tracked (durable dedup ledger, not derived).

**A2 — Manual-queue reset is destructive + tied to uncommitted output. (HIGH)**
`ingestManualQueue` (`ingest.ts:359-372`) rewrites `social-queue.json` to empty
right after moving entries to `social-queue.published.json`. The queued items now
only live as candidates in the generated, uncommitted `data/inbox.json` (A1). If
the operator doesn't act before the next ingest, the queue entries are effectively
lost. Fix: guard the drain (preserve archive-before-clear ordering; make clearing
contingent on entries reaching `state.json` covered, or at least crash-safe).

**A3 — Two divergent feature branches. (MEDIUM)**
`claude/happy-davinci-oXH8l` (current) and `claude/ai-news-platform-XeTXH` both
exist locally and on origin. Decide which is canonical via
`git log --oneline --left-right --graph happy-davinci...ai-news-platform`. **No
delete / force-push without explicit approval.** All work stays on `claude/happy-davinci-oXH8l`.

**A4 — No CI guard against committing generated artifacts. (LOW)**
After A1, add a `verify.yml` step that fails if `git status --porcelain` is
non-empty after `npm run build`.

## B. `scripts/ingest.ts` robustness

**B1 — No fetch timeout. (HIGH)** `fetchText` (`ingest.ts:106-121`) has no
AbortController/timeout, unlike `verify-article.ts:106`. One hung feed among ~70
sources stalls the entire run. Fix: reuse the timeout pattern at
`verify-article.ts:105-132`; default ~15s, env-overridable.

**B2 — Strictly sequential fetching of ~70 sources. (MEDIUM)** `ingestRss` (`:248`)
and `ingestSocial` (`:305`) await each source in series. Fix: bounded concurrency
(~6–8); keep the existing date sort at `:385`.

**B3 — No in-run dedup across rss/social/manual. (LOW)** `state.has(url)` only
filters previously-covered URLs; one URL from two sources yields duplicates. Fix:
dedup merged `items` by canonical URL before writing (`:385`).

**B4 — Brittle regex XML/HTML parsing. (LOW, accept-or-harden)** `parseItems`,
`tagText`, `extractLinks`, sitemap/listing parsing break on nested/malformed
markup. Acceptable for the no-dependency design; document the limit. Do not
over-engineer.

## C. `scripts/verify-article.ts` — make the gate trustworthy

**C1 — Plagiarism gate is cosmetic in CI. (HIGH) — DECIDE.**
`SHOULD_FETCH` is false when `VERIFY_FETCH=0` (`:19`) and `.github/workflows/verify.yml`
runs offline, so the >25-word verbatim check (`:180`) never runs in CI.
Unreachable refs warn-and-pass (`:183-186`). **Decision needed:** (a) run against
cached/snapshotted refs in CI, or (b) keep local-only but print a loud
"PLAGIARISM CHECK SKIPPED (offline)" banner and surface unreachable-ref counts in
the summary.

**C2 — Hand-rolled YAML parser duplicates the Zod schema. (MEDIUM)**
`parseFrontmatter` (`:24-81`) re-implements parsing already authoritative in
`src/content/config.ts`; the two can drift. Fix: validate frontmatter via that
schema (import it or use `astro check`); narrow the local parser to body
extraction only.

**C3 — Required-field check is presence-only. (LOW)** `:158-160` checks key
presence, not type/non-empty (empty `tags: []` / blank `summary` pass). Mostly
subsumed by C2.

---

## Suggested order
1. A1 + A2 (worktree dirt + data-loss) — highest impact, lowest effort.
2. B1 (timeout). 3. C1 (trustworthy gate). 4. B2, C2. 5. A3, A4, B3, B4, C3.

## Files in scope
`.gitignore` + `git rm --cached data/inbox.json` (A1) · `scripts/ingest.ts`
(A2, B1, B2, B3) · `scripts/verify-article.ts` (C1, C2, C3) ·
`.github/workflows/verify.yml` (A4, C1) · reuse `src/content/config.ts` (C2).

## Verification once implemented
- `git status --porcelain` stays empty after `npm run ingest` and `npm run build`.
- Point a source at a dead URL → `npm run ingest` finishes within the timeout (B1).
- Duplicate one URL across two sources → single inbox entry (B3).
- `npm run verify` offline → loud SKIPPED banner + unreachable count (C1).
- Reachable ref with a >25-word verbatim copy locally → `verify` exits 1 (C1).
- Schema-violating frontmatter → `verify` and `astro build` reject consistently (C2).
- Clean content → `npm run verify` and `npm run build` both pass.

## Notes for the implementing agent
- Pick up cold: no code changed yet; these are diagnoses, not fixes.
- Reuse, don't reinvent: timeout pattern at `verify-article.ts:105-132`; schema at
  `src/content/config.ts`.
- A2 is destructive — preserve archive-before-clear ordering; test crash-between-writes.
- Commit slicing: A1+A2 first, then B1, then C1 — each its own commit so the
  hygiene fix can be reverted independently.
- Constraints: no destructive git ops without approval; keep the no-paid-dependency
  design; don't add heavy parsing libs unless B4 failures are observed.
