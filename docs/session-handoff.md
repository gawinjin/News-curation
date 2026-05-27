# Session Handoff

Last updated: 2026-05-18

## Current branch

`claude/ai-news-platform-XeTXH`

## Current state

Uncommitted audit/RSS/CI fixes are present in the working tree.

## What changed

- Upgraded the site to Astro 6 and migrated content config from `src/content/config.ts` to `src/content.config.ts`.
- Removed `@astrojs/tailwind` and added `postcss.config.cjs` for Tailwind processing.
- Added `typecheck` and `audit:prod` scripts and wired them into GitHub verify/deploy workflows.
- Added shared deterministic article sorting in `src/lib/articles.ts`.
- Updated article routes and links to use Astro 6 content-layer IDs safely.
- Improved RSS with deterministic ordering, `lastBuildDate`, and Atom self-link metadata.
- Fixed `brief-to-mdx` typing, manual social queue cleanup, view-transition listener guards, and `heroEmbed.caption` support.
- Added this handoff discipline to `AGENTS.md`.

## Validation already run

Run under Node 24.14.0 from the bundled Codex runtime:

- `npm ci --ignore-scripts` passed.
- `npm run typecheck` passed.
- `VERIFY_FETCH=0 npm run verify` passed.
- `npm run build` passed and generated 126 pages.
- `npm run audit:prod` passed with 0 vulnerabilities.
- Full `npm run verify` passed; existing unreachable-reference notices remain.
- Local browser smoke test passed for the homepage and an article page; no console errors.

## Pending

- Review the diff.
- Commit the changes.
- Push to `claude/ai-news-platform-XeTXH` and `main` if deployment should pick them up.
- If deploying through GitHub Actions, Cloudflare secrets must still exist in the GitHub repo settings.

## Warnings

- The project now requires Node `>=22.12.0`.
- The local system Node observed during this session was Node 20.17.0, so local commands should use Node 24 or upgrade the system Node.
- `npm install` was run with `--ignore-scripts` to avoid package lifecycle script execution.
