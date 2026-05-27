# Codex Manual Curation Workflow

This is the operating procedure for manually updating Signal. Codex performs the research, editorial judgment, writing, bookkeeping, and validation in one controlled flow.

## Safety Gate

Before beginning a curation run:

1. Run `git status --short --branch` and inspect upstream divergence.
2. Preserve or reconcile a dirty or diverged tree before pulling or writing.
3. Never stage `.claude/worktrees/` or use `git add -A`.
4. Commit, push, open or update a PR, and deploy only when the human explicitly authorizes that action.

## Manual Run

1. Read [`../AGENTS.md`](../AGENTS.md), the current article format, `data/state.json`, `data/run-log.md`, and the latest output state.
2. Run `npm run ingest` when a fresh RSS/social candidate inbox is useful, or inspect user-supplied candidate URLs directly.
3. Select only new, useful, source-backed candidates with a realistic `<PracticalGuide>` for a general reader.
4. Open the primary source and any necessary direct supporting source. Verify publication dates, concrete claims, availability, and duplicates independently.
5. Create or edit `src/content/articles/<YYYY-MM-DD-slug>.mdx` directly. Use reported facts for factual claims; label analysis or inference clearly when included.
6. For each finished article, append cited URLs to `data/state.json`, update `lastIngest` when ingest was run, and record the outcome in `data/run-log.md`.
7. Run `npm run test:verify`, `npm run verify`, and `npm run build`. Fix failing drafts or remove them from the run.
8. Report selected and skipped stories, sources verified, files changed, checks run, and any remaining uncertainty.

## Publication Gate

CI may use `VERIFY_FETCH=0 npm run verify` for deterministic structural checks. Before any user-authorized publication, Codex must run and record a network-backed `npm run verify` result so overlap checks are performed against reachable live sources.

When a commit is authorized, stage only reviewed paths such as:

```bash
git add -- src/content/articles/<article>.mdx data/state.json data/run-log.md
```

Add implementation or handoff files only when they were intentionally changed and reviewed.

## Candidate Decisions

- Prefer primary sources and reputable direct reporting.
- A social post is a discovery lead unless it is itself the source of the claim; follow its linked source where available.
- Drop inaccessible, duplicate, hype-only, or non-actionable items.
- One strong story is enough; no qualifying story means publish nothing and record that result.

## Retained Data

- `data/state.json`: covered source URL deduplication state.
- `data/inbox.json`: latest generated ingest candidate list.
- `data/social-queue.json` and `data/social-queue.published.json`: manual social ingest queue and its processing audit.
- `data/run-log.md`: record of curation decisions and validation.
