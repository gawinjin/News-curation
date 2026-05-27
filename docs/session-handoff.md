# Session Handoff

Last updated: 2026-05-27

## Current branch

`codex/signal-repair-consolidation`

## Current state

This local repair branch consolidates the previously dirty Astro 6/platform maintenance work, the upstream editorial history through May 21, and the May 25 Datasette article. It has not been pushed, deployed, or published.

Signal is now documented as a Codex-only manual curation flow. Obsolete handoff artifacts, the stale nested publishing worktree, and its redundant local branch have been removed.

## Included history

- `b2b43a6` preserves the prior Astro 6/platform maintenance working tree as a local commit.
- `dccfde7` merges `origin/claude/ai-news-platform-XeTXH` through May 21, retaining upstream RSS/editorial behavior and resolving `scripts/ingest.ts` with the local queue-audit status handling.
- `e9dda27` cherry-picks the May 25 Datasette article, published brief, inbox change, and covered-URL state.
- `398ae76` ignores nested `.claude/worktrees/`, hardens manual-run staging/authorization rules, and fixes/tests the 25-word overlap boundary.

## Codex-only cleanup

- Replaced the Claude/subagent orchestrator playbook in `AGENTS.md` and `docs/agent-workflow.md` with a direct Codex manual curation procedure.
- Removed `AI-News-Scout-2026-05-21.md`, the retired `scripts/brief-to-mdx.ts` generator, `docs/brief.example.json`, and `data/briefs/` artifacts.
- Retained `data/inbox.json`, `data/state.json`, `data/social-queue*.json`, and `data/run-log.md` because they support candidate intake, deduplication, manual queue audit, and curation logging.
- Updated `README.md` and `package.json` to match the remaining operational commands and Astro 6 baseline.
- Made deployment manual-only by removing automatic `main`-push deployment and added verifier boundary tests to both GitHub validation workflows.
- Hardened `scripts/ingest.ts` so malformed dedup or manual-queue JSON stops the run instead of silently falling back to empty data.
- Updated the public About copy and article scaffolder so they reflect manual requested runs and use the local calendar date for new article filenames.
- Removed `.claude/worktrees/competent-cannon-74ea2e` and its corrupt `.git/worktrees/` registration after confirming its Datasette patch is retained on this branch; deleted the redundant local branch `claude/competent-cannon-74ea2e`.

## Validation already run

Run under bundled Node 24.14.0:

- TypeScript `tsc --noEmit` passed.
- `tsx --test scripts/verify-article.test.ts` passed: 25 matching words accepted, 26 rejected, punctuation/case normalization detected, and unrelated prose accepted.
- `VERIFY_FETCH=0 tsx scripts/verify-article.ts` passed for all 49 articles.
- `astro build` passed and generated 145 pages.
- `pagefind --site dist` passed and indexed 145 pages.
- Consolidated content check found the May 20-21 upstream articles and `2026-05-25-datasette-agent.mdx`, with zero duplicate entries in `data/state.json`.
- After the Codex-only cleanup, TypeScript, verifier boundary tests, offline verification of all 49 articles, Astro build (145 pages), and Pagefind indexing (145 pages) passed again.
- After the core-operation hardening, TypeScript, verifier boundary tests, offline verification of all 49 articles, and Astro build (145 pages) passed again.

## Hold points

- `git worktree list` now reports only the primary checkout; the prior Windows/WSL metadata warning no longer applies to the removed nested worktree.
- CI/offline verification does not fetch live references. Before any user-authorized publication, run and record a network-backed `npm run verify`.
- No push, PR, deployment, automation, Hermes call, Gemini call, or research-worker migration occurred in this repair.

## Pending authorization

- Review the local repair branch.
- Push, open a PR, or deploy only after explicit user approval.
