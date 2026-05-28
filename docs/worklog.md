# Signal — Worklog

Newest entries first. Each run records what was added, what was skipped and why,
state changes, environment caveats, and notes for the next agent.

---

## 2026-05-28 run, part 3 (PR monitoring — live)

**Status: PR #3 CI green, subscribed and watching.**

- Subscribed this session to `gawinjin/news-curation#3` activity
  (`subscribe_pr_activity`). New CI failures / review comments arrive as
  `<github-webhook-activity>` events and will be triaged here.
- Latest commit `95ad7ba`: both `verify` GitHub Actions check runs **completed /
  success**. (Combined commit *status* reads "pending" only because the repo has no
  legacy statuses — the check runs are the real CI and they pass.)
- Review threads: **0 unresolved**. Nothing to address.
- Next agent: if you inherit this session, the PR is in a clean, mergeable-pending
  state (still a draft). No outstanding fixes. Keep updating this worklog on each
  PR event per standing instruction.

---

## 2026-05-28 run, part 2 (multi-agent research round)

Followed up the first run by dispatching **3 Sonnet research subagents** (cheaper
model, managed by the orchestrator) across separate beats — OpenAI/ChatGPT,
Anthropic/Claude, and other labs — each instructed to use WebSearch only, stay in
the 2026-05-21→28 window, and corroborate every fact across ≥2 outlets. I reviewed
their candidates, dropped the out-of-window and enterprise-marketing ones, then
wrote the articles myself.

### Added — 3 articles
| Date | Slug | Category | Angle | Sources |
| --- | --- | --- | --- | --- |
| 2026-05-22 | `grok-connectors-skills` | guides | xAI adds Vercel/Canva/Gamma/S&P connectors + Skills; Grok as a workspace | x.ai, InfoQ |
| 2026-05-26 | `anthropic-glasswing-claude-mythos` | research | Claude Mythos found 10,000+ security bugs; Anthropic may release Mythos-class models later | Anthropic, Help Net Security, The Register |
| 2026-05-27 | `chatgpt-ads-open-all-businesses` | insights | OpenAI drops $200k ad minimum, opens ChatGPT Ads Manager to all US businesses | OpenAI, The Decoder, WinBuzzer |

Running total: **53 articles**, build clean (147 pages).

### Skipped (subagent candidates that didn't clear the bar)
- ChatGPT Personal Finance dashboard (May 15), ChatGPT Trusted Contact (May 8) —
  both pre-window.
- Anthropic: Claude for Small Business (May 13), SpaceX compute / doubled limits
  (May 7), Gates Foundation $200M (May 14) — pre-window and/or marketing/partnership.
- Microsoft Copilot Studio computer-using agents GA (May 13) — enterprise, pre-window.
- Mistral Medium 3.5 + Le Chat Work Mode (May 2) — pre-window. Strong consumer story;
  good candidate to backfill if the window is ever widened.
- xAI Grok Build coding agent (May 14) — pre-window; folded context into the Grok piece.

### State changes
- `data/state.json`: appended **8** cited URLs (98 → 106 covered); `lastIngest`
  bumped to `2026-05-28T12:00:00Z`.

### Gotcha for the next agent
- **`npm run verify` does NOT enforce the 220-char `summary` cap; the Astro build
  (Zod schema in `src/content/config.ts`) does.** Two articles passed verify but
  failed `npm run build` on an over-long summary. Always run `npm run build` before
  committing — verify alone is not sufficient.
- Subagent research is cheap and effective here, but it returns plenty of
  out-of-window items confidently; the orchestrator must filter on date + audience.

---

## 2026-05-28 run (coverage extended to 2026-05-27)

**Branch:** `claude/happy-davinci-oXH8l` · **Prior cutoff:** latest article was
`2026-05-21`. Goal: add news after the cutoff, up to today.

### Added — 2 articles
| Date | Slug | Category | Primary angle | Key source |
| --- | --- | --- | --- | --- |
| 2026-05-26 | `gemini-spark-beta-ultra` | insights | Gemini Spark background agent opens to US AI Ultra beta; what it can touch and how to try it safely | CNBC / 9to5Google / Google I/O announcements |
| 2026-05-26 | `google-ai-ultra-price-cut` | insights | AI Ultra entry price cut $250→$100 (top tier $250→$200); is it worth it | Business Standard / Tech Times / CNBC |

Both pass `npm run verify` (50/50) and `npm run build` (147 pages indexed).

### Skipped / not published — and why
- **Gemini Spark (as a fresh standalone)** — the May 19 announcement is already
  covered by `2026-05-21-gemini-spark-omni-daily-brief.mdx`. The new piece is
  scoped to the *beta actually opening to Ultra* + a safety-focused try-it guide,
  not a re-announcement.
- **Fujitsu × Anthropic/OpenAI partnership (May 27)** — enterprise partnership, no
  reader-actionable Practical Guide. Fails the "high-signal for general users" bar.
- **Anthropic Managed Agents: self-hosted sandboxes + MCP tunnels (May 19)** —
  developer-only; off-audience for Signal's general readers.
- **Simon Willison, "product-market fit" essay (May 27)** — strong in-window voice
  piece, but the source page is unreachable (see caveats); could not read it to
  paraphrase faithfully, so it was not written. Good candidate for the next run.
- **ChatGPT Trusted Contact / Images 2.0** — both are pre-cutoff (May 7 / Apr 21),
  not new since 2026-05-21.

### State changes
- `data/state.json`: appended **5** cited URLs (93 → 98 covered).
- `lastIngest` updated to `2026-05-28T00:00:00Z`.
- `data/inbox.json` was regenerated by `npm run ingest` but is **intentionally not
  committed** (it is a derived artifact; see caveats).

### Environment caveats for the next agent — READ THIS
- **`npm run ingest` returned 0 candidates this run.** All 11 RSS feeds 403'd and
  all 42 Nitter mirrors were unreachable. The inbox is effectively dead in this
  environment; do not rely on it.
- **`WebFetch` is blocked (HTTP 403) on every primary source tested**
  (anthropic.com, openai.com, help.openai.com, simonwillison.net, blog.google via
  feed). **`WebSearch` works.** Consequence: these two articles were written from
  **corroborated secondary reporting** (multiple independent outlets agreeing), not
  from primary pages — a deliberate, user-approved relaxation of the usual
  "never paraphrase a page you can't open" rule for this run only. Facts were
  cross-checked across ≥2 outlets; no quotes were lifted.
- **`verify`'s plagiarism gate is advisory only here** — every reference emits
  "could not fetch reference for plagiarism check" because of the 403 wall, so the
  >25-word verbatim check never actually ran. Articles were composed in original
  voice to compensate. If you get network back, re-run `npm run verify` with fetch
  enabled to truly exercise the gate.
- `data/inbox.json` is git-tracked but fully regenerated each run — don't commit it
  (see `docs/review-hazards.md`, item A1, for the recommended fix).

---

## What past work has NOT been good (retrospective)

Read from the existing 47 articles before this run. Fix these going forward:

1. **Formulaic rhythm.** Near-identical TL;DR → What's New → Why It Matters cadence,
   with recurring tics ("The practical test is simple", "This is the shape … is
   likely to take"). Many articles are interchangeable in structure.
2. **Vendor echo.** Heavy "Google says / Anthropic lists / Anthropic says" — often a
   polite rephrase of the press release rather than independent, reader-useful
   judgement.
3. **Boilerplate Practical Guides.** Repeated closers ("save the prompt", "pick a
   task and compare it") instead of product-specific, testable steps.
4. **Thin specifics.** Leans on "fast / reliable / useful"; few concrete numbers,
   prices, limits, or benchmark deltas a reader could act on.
5. **Summary restates the title.** The `summary` frontmatter often adds no new fact.
6. **Category drift.** Partnerships and marketing posts ("How sales teams use
   Codex", "Claude for Small Business") filed under `model-releases` though no model
   shipped.
7. **Borderline-signal days.** Some enterprise-marketing items were published that
   arguably fail the "high-signal for general users" bar.
8. **No primary-source texture.** Because the fetch/plagiarism gate is usually
   skipped, articles almost never carry a crisp ≤25-word quote for authority.

---

## Editorial guidelines — voice & style (apply going forward)

Additive to `AGENTS.md`; does **not** change the protected bar (25-word cap,
required sections, audience, schema). These sharpen the writing:

- **Lead with the concrete change, not the framing.** First sentence states what is
  new and what the reader can now do. No throat-clearing.
- **One distinct fact per paragraph; name numbers.** Prices, sizes, limits, dates,
  benchmark deltas. If you can't name a specific, question whether it's worth
  publishing.
- **Earn the summary.** `summary` must add a fact the title doesn't already state.
- **Kill the tics.** In addition to AGENTS.md's banned words, avoid: "The practical
  test is simple", "This is the shape … is likely to take", "It's worth noting",
  "matters because". Vary sentence openings.
- **Independent stance.** Attribute claims ("Google says") but add a reader's-eye
  "so what" — what to trust, what to wait on, what it competes with.
- **Practical Guides must be product-specific.** Name the actual button, menu, URL,
  setting, or command for *this* release. No generic "pick a task and compare"
  closers; no repeated "save the prompt" step.
- **Use one real quote when reachable.** A single ≤25-word verbatim line (quoted,
  linked) beats three paraphrases for authority.
- **Right-size the category.** Partnerships / marketing → `insights`; ship
  `model-releases` only when a model or version actually ships.
- **Silence beats slop.** If it's vendor PR with no reader action, skip it.
