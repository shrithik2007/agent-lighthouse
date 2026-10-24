# Submit-tab fields (https://kaneclihack.sh/t/lighthouse/submit)

Placeholders still to fill: [COMMIT_SHA] · [VIDEO_URL] · [DEVPOST_URL]

Numbers come from `results/latest.json` (generated from the apply-mode loop `2026-10-24T21-17-14` and the baseline in `results/baseline.json`).

**Project name:** Agent Lighthouse

**Project type:** Web App

**One-line pitch:** Measure how agents book, propose fixes for what trips them, and prove the fixes before an owner accepts them.

**Repository URL:** https://github.com/shrithik2007/agent-lighthouse

**Exact commit SHA (40 hex):** [COMMIT_SHA]

**Live demo URL or run command:** https://shrithik2007.github.io/agent-lighthouse/ (product page) · https://shrithik2007.github.io/agent-lighthouse/dashboard/ (live report, two cases, savings)

Local:
```
npm ci && npm run serve & npm run dashboard
# measure: node lighthouse/measure.mjs http://localhost:4101 3
# loop:    OPENAI_API_KEY=... OPENAI_MODEL=gpt-5.5 npm run loop -- --flow book --threshold 80 --max-attempts 3 --mode propose
```
Dashboard: http://localhost:4100 (recorded run: http://localhost:4100/?recorded=1)

**Kane run report / evidence:** https://kaneclihack.sh/t/lighthouse/proof. Key runs: KR-133 (BEFORE failed: confirmation assertion, triaged `confirmed_product_bug`), KR-150 (green rerun after the repair), KR-148 and KR-153 (human path failed before, passed after), and KR-170, a `testmd` replay of the saved human-path test, labelled PASSED (VERIFIED). The packs are committed in `evidence/packs/` and the per-run streams in `evidence/runs/`. Passing runs show as "errored" on the Proof tab because of a wrapper bug (see limitations).

**Problem:** AI agents are starting to book things for people, but they only work smoothly where there's a formal integration. ChatGPT books restaurants through OpenTable, Resy and Yelp. On the open web, general agents still fail often: on Online-Mind2Web the best agent succeeded on about 61% of tasks and most on about 30%. A small business with only a website has no way to know whether an agent can book with it, or what to fix.

**What we built:** Agent Lighthouse runs Kane CLI against a booking flow to produce a score and an Agent Tax (extra steps, seconds and credits per successful booking). It sends Kane's failing remark and screenshot to the OpenAI API for a diagnosis, has Codex patch only `site/` on a branch, and re-measures with fresh Kane runs plus a human-path guard. Only a patch that scores at least 80 and passes the human path is proposed to the owner (or applied, on sites we own).

**How it works (steps):**
1. Kane runs the booking objective three times from scratch. The NDJSON streams are parsed into steps (actions vs overhead), failures, time and credits.
2. The OpenAI API (gpt-5.5) diagnoses the lead Kane failure from its remark, the failing-step screenshot, console and network excerpts, and a six-pattern checklist.
3. Codex (`codex exec`, gpt-5.3-codex) edits `site/` on an attempt branch. A scope guard reverts anything outside `site/`.
4. Kane re-measures three fresh runs plus a named human-path run. The patch qualifies only on score ≥ 80 and human path passed. Otherwise it retries, and after three attempts it escalates. Propose mode writes a PR description; apply mode fast-forwards.

**4-step harness flow:** Measure (3 fresh Kane runs) → Diagnose (OpenAI on Kane's failing remark and screenshot) → Fix (Codex, site files only, scope guard) → Prove (3 fresh Kane runs + human path, gate at 80, fixture-leak check).

**Harness description:** Fresh goal-driven runs with a natural-language date (the ISO format is never mentioned) and three sequential runs per measurement; replays are never scored. A named human-path run checks that the reference PL-4821 is still visible five seconds after booking. Every completed step is counted, keyed by child context, and split into actions vs overhead. optimalSteps = 10 was hand-counted and confirmed.

**Kane components used:** `kane-cli run --agent --headless --timeout 180` (NDJSON, `run_end`, exit codes), `--name human-path` saved run, `kane-cli testmd run` replay of the saved test, evidence packs (failing-step screenshot, failure.yaml, console/network logs) read by the diagnosis, `kane-cli evidence serve`, Kane's failure triage (`confirmed_product_bug`) and blocker classification (`blocker.captcha`), the assurance loop (`context ingest` → owner answer → `context review --approve` → `design tests`: 15 criteria, 5 scenarios, 5 designed tests, 3 gaps → `cover`: 0%, nothing run yet; `evidence/assurance/`), and `kanehack report` to register runs, and Kane's official GitHub Action (`kane-cli-browser-run`) replaying the committed human-path test on every pull request and posting Kane's verdict on the PR.

**Measured impact:** BEFORE scored 51 (2/3 passed, median 22 steps). The loop's repair scored 97 (3/3 passed, median 12 steps, exactly 10 actions each), qualifying on attempt 1 with the human path passing. Agent Tax removed: +10 steps · +84 s · +36.2 credits per booking. The hand-built reference fix also scores 97. Repeatability: three full loops from BEFORE all qualified on attempt 1 (97 apply, 94 propose, 94 apply), each with a passing human path. Case 2 (hard mode, eleven problems): BEFORE 0 (0/3: all three stopped at the fake captcha, `blocker.captcha`; Kane refuses to pretend to be human; Agent Tax n/a because no pre-fix run succeeded), first loop's fix 98 but rejected by owner review (removed human verification, hard-coded the test date); with the fixture-leak check, the second loop blocked a repeat of that as suspect on attempt 1 (98) and qualified a clean attempt 2 at 95 (3/3, human path passed). Case 3 (worst of the real web, six patterns from published agent-failure research, sources in FRICTION.md): Kane booked 3/3 at baseline, score 88, but a median of 33 steps against 14 optimal. Fixture-leak gate: commit 8449a6a. Savings for case 1: 36.2 credits per booking, 2.9× fewer credits, about 18,100 credits a month at 500 agent bookings.

**Known limitations:** The Proof tab labels passing Kane 0.10 runs "errored": the `kanehack report` parser (`lib/stream.mjs`) treats Kane's `coverage` event as an assurance stream and ignores `run_end` (ticket H-0011). Exit codes and `run_end` are preserved, and raw streams are in `evidence/`. The score weights are a design choice and optimalSteps is hand-counted. The demo site has planted patterns and no booking backend. Kane varies from run to run (BEFORE took 14–24 steps), and three runs per side is a small sample. The fix loop is limited to sites we own, and score-only mode for external sites is not built. In case 2 the first loop's gate qualified a patch that removed human verification and hard-coded the test date; owner review rejected it, and the gate now has a fixture-leak check that marks such patches "suspect, owner review required" (run on history it also flags mild test-data leaks, such as hint and placeholder text, in the three case 1 repairs). Kane refuses captcha-style checks, so sites with real bot protection need an owner-approved test path.

**Screenshots:** `gtm/screenshots/dashboard-row1.png`, `gtm/screenshots/social-preview.png`, `gtm/screenshots/failing-step.jpg`, `gtm/screenshots/proposal.png`, `gtm/screenshots/terminal-run-end.png`

**Demo video:** [VIDEO_URL]

**Team credits (consent):** Team Lighthouse: Sreesanth Nitillan Senthilkumar (LinkedIn shrithiksk, X @shrithik2007). Built with Codex (Phase 0) and Claude Code. Consent to be credited: confirm on the Submit tab.

**Devpost link:** [DEVPOST_URL]

**Evidence location:** `evidence/` in the repo (`evidence/README.md` explains each item), plus `results/` for the scores, loop records, proposal and OpenAI call log.
