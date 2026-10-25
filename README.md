# Agent Lighthouse

Kane measures booking friction. OpenAI proposes repairs. Kane verifies the change before the owner reviews it.

**Track:** Web App · **Team:** Lighthouse · **Built:** October 24, 2026, Kane CLI Hack Day SF.

**Product page:** https://shrithik2007.github.io/agent-lighthouse/ · **Live report:** https://shrithik2007.github.io/agent-lighthouse/dashboard/ (case switcher, savings panel; `?recorded=1` for the recorded demo run)

## What it does

AI agents are starting to book things for people. Agent Lighthouse measures how hard a site makes that, repairs what trips the agent, and proves the repair before anyone merges it:

1. **Measure.** Three fresh, goal-driven Kane CLI runs try to book a free first visit at Pitchline, a fictional climbing gym. Each run's NDJSON stream becomes a score and an **Agent Tax**: the extra steps, seconds and credits an agent spends per successful booking.
2. **Diagnose.** The OpenAI API (gpt-5.5) reads Kane's failing remark, the failing-step screenshot, console and network excerpts, and a checklist of six friction patterns. It returns a cause, files to touch, concrete changes and an acceptance check.
3. **Fix.** Codex (`codex exec`, gpt-5.3-codex) edits `site/` on its own branch. A scope guard reverts anything outside `site/` and records it.
4. **Prove.** Three fresh Kane runs plus a named **human-path** run that checks the reference `PL-4821` is still visible five seconds after booking. A patch qualifies only on **score ≥ 80 and human path passed**. Otherwise it retries, and after three attempts it escalates.
5. **Owner review.** `propose` mode (the default) leaves the branch and writes `results/proposal.md` as a PR description. `apply` mode, for sites we own, fast-forwards it. We never change a site we don't own.

## Measured results

All numbers come from real Kane CLI 0.10.0-rc.3 runs on October 24, 2026, launched through `kanehack report -- kane-cli run "<objective>" --agent --headless --timeout 180`. Source files: `results/baseline.json`, `results/loop/*.json` and `results/latest.json`.

| | Score | Passed | Median steps (actions + overhead) | Median time | Median credits |
| --- | --- | --- | --- | --- | --- |
| BEFORE (`site/` as planted) | **51** | 2/3 | 22 | 141.1 s | 55.4 |
| After the loop's repair (attempt 1, `94a7f80`) | **97** | 3/3 | 12 | 56.8 s | 19.2 |
| Reference fix (hand-built AFTER fixture) | 97 | 3/3 | 12 | 61.2 s | 19.8 |

**Agent Tax of BEFORE: +10 steps · +84 s · +36.2 credits per successful booking** (successful-run medians compared with the repaired page).

- **What Kane caught.** Run KR-133 failed at `assert: a booking confirmation with a reference code is shown`, with reason `assertion_error.confirmed_product_bug`: "The completed free-visit form did not show a booking confirmation or reference code after it was submitted." That is the planted toast, which disappears after 2.5 seconds. The two BEFORE runs that passed needed 17 and 18 actions against an optimum of 10.
- **Human path.** It failed on BEFORE (KR-148, `assert: the text PL-4821 is still visible on the page`) and passed after the repair (KR-153).
- **Loop.** The apply-mode loop qualified on attempt 1. The OpenAI diagnosis led with the KR-133 remark and screenshot. Codex changed only `site/index.html` (+21/−16), and the scope guard reverted nothing. Kane then passed 3/3 in 11, 12 and 13 steps, with exactly 10 actions each time.
- **Repeatability.** We ran three full loops from the BEFORE page, each with a fresh diagnosis and a fresh Codex fix. All three qualified on attempt 1:

  | Loop | Mode | Commit | Score | Human path | Agent Tax of BEFORE (steps · s · credits) |
  | --- | --- | --- | --- | --- | --- |
  | `2026-10-24T21-17-14` | apply | `94a7f80` | 97 | passed (KR-153) | +10 · +84 · +36.2 |
  | `2026-10-24T21-25-00` | propose (branch left unmerged; `results/proposal.md`) | `6c8bed1` | 94 | passed (KR-160) | +8 · +67 · +35.6 |
  | `2026-10-24T21-35-03` | apply (hardening) | `81918da` | 94 | passed (KR-166) | +8 · +74 · +33.6 |

  The baseline human path failed in every loop (KR-148, KR-154, KR-161). Agent Tax differs between loops because each repaired page is measured afresh, and Kane varies.
- **Replay.** The named human-path run on the repaired site (KR-169) was saved as `tests/kane/human-path_test.md`, and `npm run kane:replay` replays it. It replayed once and passed in 12 s (KR-170). Replays are feature coverage only, never scored.

## Case 2: hard mode

A second sample site (`fixtures/hard/`, working copy `site-hard/` on :4103) has a two-step class booking with the six original problems plus five more: a newsletter modal that opens 3 s after load, time slots in a custom dropdown that opens on hover only, a date picker made of unlabeled divs that starts on the wrong month, an "Are you sure?" step whose primary button says "Go back", and a reCAPTCHA-style check that is a styled div. jsdom tests (`tests/hard.test.mjs`) prove a careful human can complete it. Reference `PL-7302`, optimalSteps 14 (reasoning in `flows/book-hard.json`, confirmed by the owner).

| | Score | Passed | Median steps | Human path |
| --- | --- | --- | --- | --- |
| BEFORE (KR-190, KR-191, KR-193) | **0** | 0/3 | 12 | failed (KR-194) |
| First loop, attempt 1 (`134e5b8`): gate fooled, owner rejected | 98 | 3/3 | 16 | passed (KR-206) |
| Second loop, attempt 1 (`226a15e`): **blocked as suspect** by the leak check | 98 | 3/3 | 16 | passed (KR-225) |
| Second loop, attempt 2 (`72c3a14`, unmerged proposal) | **95** | 3/3 | 19 | passed (KR-235) |

- **What Kane caught:** every BEFORE run cleared the newsletter modal, cookie wall, class step, month navigation and hover-only dropdown, then stopped at the fake captcha with `reason_code: blocker.captcha`: "The booking could not be completed because a CAPTCHA required a human verification." Kane will not impersonate a human.
- **Kane refuses to pretend to be human.** The reCAPTCHA-style widget is where all three baseline runs stopped. That's a feature worth naming: an agent that solves human checks would be one site owners can't trust. To be precise about the boundary: when attempt 2 turned the widget into a plain checkbox labelled "I'm not a robot" (an ordinary form control with no challenge), Kane ticked it. Neither version is real bot protection; the proposal says so and leaves the choice to the owner.
- **Agent Tax: n/a.** No pre-fix run succeeded, so there is no per-booking tax or credit ratio to compute; the dashboard says so instead of showing zero.
- **The gate working (second loop, after the fixture-leak check):** attempt 1 scored 98 with the human path passing, but was blocked as **suspect, owner review required** because it again hard-coded the test date and removed the human check. Attempt 2 was told why, passed the check (the scope guard also reverted a stray file the fixer created outside `site-hard/`) and qualified at 95. Records: `results/loop/2026-10-24T22-48-42.json`, `results/cases/hard/proposal.md`.
- **The first loop's gate passed a patch an owner should reject** (kept as-is): it qualified on attempt 1, but the fix removed the human-verification check ("Demo mode: no human verification required") and hard-coded the test's date (`selectedDate = '2026-11-02'`). The gate checks outcomes, not intent. The operator review note at the end of `results/loop/2026-10-24T22-22-59-proposal.md` says not to merge, and the dashboard chip reads "Qualified · reviewer says do not merge". This is why propose mode is the default: a person decides.
- Records: `results/cases/hard/` (baseline, latest, proposal), `results/loop/2026-10-24T22-22-59.json`, evidence under `evidence/runs/hard-baseline-*` and `evidence/runs/loop-2026-10-24T22-22-59-*`, packs `evidence/packs/KR-190…`, `KR-194…`, `KR-196…`, `KR-206…`.

## Case 3: worst of the real web

A third sample site (`fixtures/worst/`, working copy `site-worst/` on :4104) plants six patterns taken from published agent-failure research, each cited inline and in [FRICTION.md](FRICTION.md) after reading the source: a consent modal in a same-origin iframe that traps focus and locks scroll (maxaeo.ai: 38% completion when consent blocks scroll vs 79%), overlapping newsletter and location modals with focus on the lower one (Future AGI), a required mid-flow location picker (geotoolbox.ai), time slots drawn on a canvas with no DOM nodes plus a visually hidden accessible list (MERJ: ~24–34% on canvas apps), the submit button three screens down (maxaeo.ai, citing a study where agents "essentially never scrolled beyond two viewports"), and a confirmation that appears 4 s after submit (geotoolbox.ai). No captcha; case 2 covers that. jsdom tests (`tests/worst.test.mjs`) prove a careful human can complete it. Reference `PL-5519`, optimalSteps 14 (reasoning in `flows/book-worst.json`; not owner-confirmed).

- **Baseline: Kane booked in 3 of 3 runs** (KR-243, KR-244, KR-247): score **88**, but a median of **33 steps** (27–31 actions) against an optimum of 14, 169 s and 46.7 credits per booking. The research patterns cost Kane time and steps but did not stop it. Without a repaired measurement, only the step tax is computable at baseline: +19 steps over optimal.
- **Propose loop (2-attempt cap for time): qualified on attempt 1, 88 → 91.** 3/3 passed, median 26 steps (from 33), 111 s and 31.7 credits; human path passed (KR-264); fixture-leak check clean; scope guard reverted nothing. **Agent Tax removed: +7 steps · +58 s · +15.1 credits per booking.** Branch `lighthouse/2026-10-24T23-26-10/attempt-1` (`34e32a9`), unmerged.
- **What Kane's runs showed:** no failed step, but 6–9 of 32–37 steps went to selecting "12pm (noon)" on the canvas time picker and its hidden radio list (from Kane's own step remarks).
- Records: `results/cases/worst/` (baseline, latest, proposal), `results/loop/2026-10-24T23-26-10.json`, evidence under `evidence/runs/worst-baseline-*` and `evidence/runs/loop-2026-10-24T23-26-10-*`.

### All three cases

| Case | Score before → after | Passed | Median steps | Median credits | What Kane caught | Gate |
| --- | --- | --- | --- | --- | --- | --- |
| 1 Pitchline demo | 51 → 97 | 2/3 → 3/3 | 22 → 12 | 55.4 → 19.2 | `confirmed_product_bug`: confirmation vanishes | qualified, attempt 1 |
| 2 Hard mode | 0 → 95 | 0/3 → 3/3 | 12 → 19 | 27.1* → 24.1 | `blocker.captcha` on all three runs | attempt 1 **suspect** (blocked), attempt 2 qualified |
| 3 Worst of the real web | 88 → 91 | 3/3 → 3/3 | 33 → 26 | 46.7 → 31.7 | no failure; canvas time picker cost 6–9 steps | qualified, attempt 1 |

\* Case 2's before medians come from runs that all failed.

## Savings panel

The dashboard turns Agent Tax into credits saved per booking, the before/after credit ratio, and a projection "at N agent bookings a month" (N editable, default 500). For case 1: 36.2 credits saved per booking and a 2.9× ratio (55.4 vs 19.2 median credits); about 18,100 credits a month at 500 bookings. A dollar figure appears only if the viewer enters their plan's rate; no price is assumed. Everything is in Kane's unit, credits (`credits_consumed`), never tokens.

## Run locally

Requires Node.js 24.15+ LTS and npm (Node 22.22.2+ and 26+ also work). The fix loop and measurements also need Google Chrome, `kane-cli` 0.10.0-rc (signed in), the event's `kanehack` helper, the `codex` CLI and an OpenAI API key.

```sh
npm ci
npm test                    # unit, jsdom and stream-parser tests (no network)
npm run serve               # :4101 BEFORE / working copy (site/), :4102 AFTER reference fix, :4103 hard mode, :4104 worst of the real web
npm run dashboard           # :4100 → /dashboard/ (cases, savings) and /site-public/ (product page)

# Measure a page: 3 fresh wrapped Kane runs
node lighthouse/measure.mjs http://localhost:4101 3

# Full loop (Kane always runs from your own shell, never inside a Codex sandbox)
export OPENAI_API_KEY=...   # read from the environment only; never written or printed
OPENAI_MODEL=gpt-5.5 npm run loop -- --flow book --threshold 80 --max-attempts 3 --mode propose   # or --mode apply
OPENAI_MODEL=gpt-5.5 npm run loop -- --flow book-hard --mode propose   # case 2 (hard mode); propose only
npm run report              # rebuild results/latest.json
npm run demo:reset          # restore site/index.html from BEFORE (results and evidence kept)
```

Pitchline is fictional. Both pages run entirely in the browser and create no real appointments.

## Project layout

```text
fixtures/before/index.html   Immutable baseline with the six planted problems
fixtures/after/index.html    Reference fix that repairs each problem
site/index.html              Editable working copy served on :4101; the loop's fixer edits only this
fixtures/hard/index.html     Case 2: two-step class booking with eleven planted problems (reference PL-7302)
site-hard/index.html         Case 2 working copy on :4103; the fixer edits only this for flows/book-hard.json
site-public/                 Product page for site owners (published on GitHub Pages with the dashboard)
flows/book.json              Objective, human-path objective, optimalSteps=10 and its reasoning
flows/book-hard.json         Case 2 objective, human path, optimalSteps=14, extra checklist, case paths and ports
core/score.mjs               Pure score, comparison, gate and Agent Tax functions
lighthouse/kane.mjs          Wrapped Kane launcher (kanehack report → kane-cli run), raw capture
lighthouse/parse.mjs         NDJSON stream → observation (steps, actions vs overhead, failures, credits)
lighthouse/loop.mjs          Fix loop: diagnosis → fixer → scope guard → re-measure → human path → gate
lighthouse/openai.mjs        OpenAI Responses client; logs every call to results/openai-calls.jsonl
dashboard/                   Vanilla one-page audit report: case switcher, savings panel (credits, never tokens)
evidence/                    Per-run streams, run_end, test_url, failing screenshots (see evidence/README.md)
results/                     baseline.json, loop/*.json, proposal.md, latest.json, openai-calls.jsonl
```

## Harness

- **Fresh goal-driven runs:** the objective names the task and data in plain English: "book a free first visit for Sam Rivera, email sam@example.com, on the second of November 2026 at noon. Accept the waiver. Then verify a booking confirmation with a reference code is shown and store the reference as 'ref'." The ISO date format is never mentioned. Three sequential fresh runs per measurement, and replays are never scored.
- **Human path:** one named run (`--name human-path`) that books the way a person would and checks that `PL-4821` is still visible after five seconds. A score alone never qualifies a patch.
- **Step counting:** every completed step (`done` or `failed`) is counted, keyed by child-agent context and execution so repeated indices are never collapsed. Each run also records `actionSteps` and `overheadSteps` (planning "queued plan" waits, other waits, blank remarks), and the dashboard shows both ("13 steps: 10 actions, 3 overhead"). Agent Tax compares BEFORE with the repaired page, so per-run overhead largely nets out. AFTER does not score 100 because overhead is included in the step count.
- **optimalSteps = 10**, hand-counted on AFTER and confirmed by the owner: open, click "Book a free first visit", name, email, date, time, waiver, confirm, check the confirmation, store the reference.

## Scoring contract

`scoreFlow(runs, {optimalSteps})` implements:

```text
p = passed runs / started runs
efficiency = clamp(optimalSteps / medianSteps, 0, 1)
cleanliness = 1 - clamp(medianFailedSteps / medianSteps, 0, 1)
flakiness = 4p(1-p)
score = round(100p × (0.50 + 0.20 efficiency + 0.15 cleanliness + 0.15(1-flakiness)))
```

Medians use passing runs when any exist; otherwise they use all started runs. A timeout is a failed observation with a timeout flag. A run that never started (exit 2) is rejected as score input. Missing measurements stay `null` and render as `n/a`. No successful run means a legitimate zero score but no computable tax per booking. Fewer than three runs is flagged low confidence. `agentTax` compares successful-run medians for steps, duration and credits against a baseline, flooring each at zero. `gateDecision` returns `pass`, `retry` or `escalate`, and the loop additionally requires a passing human path.

## Kane components used

Verified in this build against `kane-cli run --help` (0.10.0-rc.3):

- `kane-cli run --agent --headless --timeout 180`: NDJSON stream; `run_end` gives status, summary, duration (seconds, checked against event timestamps), credits, test_url and session_dir; exit codes 0/1/2/3
- `--name human-path` saved run (writes `.testmuai/tests/human-path*_test.md`), committed as `tests/kane/human-path_test.md` with Kane's Playwright export
- `kane-cli testmd run tests/kane/human-path_test.md --agent --headless`: replay, ending in `test_md_done` (KR-170, passed)
- Evidence packs (`.evidence`): failing-step screenshot, `failure.yaml`, console and network logs, read by the diagnosis; viewable with `kane-cli evidence serve <pack>`
- Kane's own failure triage (`reason_code: assertion_error.confirmed_product_bug`)
- `kanehack report` (event wrapper) to register every run on the team Proof tab
- Kane's blocker classification (`blocker.captcha`) on the hard-mode site
- Kane's official GitHub Action (`LambdaTest/kane-cli/integrations/github-action/kane-cli-browser-run`), in `.github/workflows/kane.yml`: on every pull request it serves the PR's sites, replays the committed human-path test for the site the PR changes (`tests/kane/`) with `--headless --agent`, uploads the evidence pack and posts Kane's verdict on the PR. Credentials come only from the `LT_USERNAME` and `LT_ACCESS_KEY` repository secrets
- Assurance: `kane-cli context ingest` (6 requirements, one owner question answered), `context review --approve uc-1`, `design tests` (15 acceptance criteria, 5 scenarios, 5 Kane-designed `_test.md` tests, 3 gaps), `cover` (0%, nothing run yet; the designed tests wait at Kane's design checkpoint for owner approval). Record in `evidence/assurance/`
- REA code evidence (flag --rea): rea-agents 6.7.0 captured the BEFORE page's scripts; our scan found the 2.5 s timer hiding the confirmation and the duplicate Go handlers, matching Kane's finding.

## The planted fixture

| BEFORE | Reference fix (AFTER) |
| --- | --- |
| Two `Go` controls; the first opens a prices dead end | Both named `Book a free first visit` and open booking |
| Full-page cookie overlay, dismissed by an unlabeled tiny div | Compact cookie bar with an `Accept cookies` button |
| Placeholder-only name, email and date fields | Associated visible labels |
| Undisclosed ISO date requirement and `Invalid input` | Native date field, hint and field-specific errors |
| Div-based time slots and waiver | Native select and checkbox |
| Confirmation toast disappears after 2.5 seconds | Persistent status panel with reference `PL-4821` |

The fixture combines realistic interaction and accessibility pitfalls. It doesn't reproduce a published benchmark. W3C guidance covers [labeling controls](https://www.w3.org/WAI/tutorials/forms/labels/), [form controls](https://www.w3.org/WAI/tutorials/forms/) and [clear notifications](https://www.w3.org/WAI/tutorials/forms/notifications/). Kane got past the cookie overlay, the dead-end `Go` and the undisclosed date format on its own: it typed `2026-11-02` without being told the format. Those problems showed up as extra actions rather than failures. The vanishing confirmation is the one Kane flagged as a product bug.

## Built today

All code was written on October 24, 2026 (see `git log`):

- **Codex** built Phase 0 (`36c47fe`): the fixtures, scoring core, tests and README.
- **Claude Code** built everything after that: the runner, parser, fix loop, dashboard, evidence and GTM.
- **The OpenAI API is part of the product**: every diagnosis is an OpenAI Responses call (gpt-5.5), and the fixer is Codex (`codex exec`, gpt-5.3-codex) using the same API key. Every call is logged in `results/openai-calls.jsonl` with timestamp, model, purpose and token counts.
- Each loop repair is its own commit naming the Kane failure it answers, for example `94a7f80 fix(site): attempt 1 answers Kane KR-133`.

## Evidence

`evidence/README.md` describes what each folder shows. Every measurement run has its redacted NDJSON stream, stderr, `run_end.json` and `test_url.txt` under `evidence/runs/<label>/`. The failing-step screenshot for KR-133 is `evidence/runs/baseline-before-1/failing-step.jpg`. The Kane run reports are on the team Proof tab: https://kaneclihack.sh/t/lighthouse/proof

## Known limitations

- **The Proof tab shows passing runs as "errored".** The event's `kanehack report` wrapper (`~/.kanehack/.../lib/stream.mjs`) mislabels Kane 0.10 runs: Kane emits a `coverage` event before `run_end`, the parser switches the stream family to "assurance", and `run_end` is then ignored. Kane's exit code (0) and `run_end` (`status: passed`) are preserved, and our scoring reads the stream directly. Reported as help ticket H-0011. The `testmd` replay KR-170 is labelled correctly (PASSED, VERIFIED). The raw stream, `run_end` and `test_url` of every run are copied into `evidence/` so the results can be checked without the label.
- The score weights are a design choice, not a validated metric. optimalSteps is hand-counted.
- The demo site has planted patterns and no booking backend.
- Kane varies from run to run (BEFORE took 14–24 steps). Three runs per side is a small sample, so we use repeated fresh measurements, never replays.
- The fix loop is limited to sites we own. External pages would get a score only, stopping before submit, and score-only mode is not built.
- Codex's ChatGPT-plan quota ran out during the first loop. That loop is kept as `results/loop/2026-10-24T21-11-48.json` (aborted). The fixer now passes the API key to Codex through the environment and falls back to the OpenAI API returning the whole file.
- **The gate checked outcomes, not intent, until the fixture-leak check.** In case 2 the first propose loop qualified a patch that removed human verification and hard-coded the objective's date; owner review caught it, and that record is kept as-is. The gate now runs a fixture-leak check (`lighthouse/leak.mjs`): a patch whose added lines contain the test's name, email or date (any common spelling), that introduces the booking reference into a page that never had it, or that removes a control the human path depends on is marked **suspect, owner review required** and cannot qualify. The reference already on the page is allowed to move, since persisting it is the fix Kane asks for.
- **Run retroactively, the check also flags all three case 1 repairs** for using test data as example text: `94a7f80` and `6c8bed1` put "2026-11-02" (and "2 November 2026") in the date hint, and `81918da` uses "sam@example.com" as the email placeholder. These are mild (example text, not pre-filled values), but they are exactly what an owner should see. Their records and scores are unchanged; the hand-built reference fix passes the check clean.
- Kane refuses to complete captcha-style human checks (`blocker.captcha`), so sites with real bot protection need an owner-approved test path before they can be measured.
- Cases 2 and 3 have no hand-built reference fix. Case 3's optimalSteps (14) is not owner-confirmed, and its loop was capped at 2 attempts for time.
- The demo loop's attempt server moved from :4103 to :4105 when :4103 became the hard-mode working copy (port only; the loop is otherwise unchanged).
- The product page quotes an illustrative (not measured) 92% vs 12% figure from Future AGI and labels it as illustrative.
- The first calibration run exited 2 because Kane was launched inside Codex's sandbox (EPERM on `~/.testmuai`, Chrome never started). Kane now always runs from the operator's shell.
- Human baseline (flag --human-baseline) is tested against stubbed PostHog responses only; not run against a real project. Human steps (click/change/submit) and Kane steps (include planning and waits) are different units; the comparison is indicative.

## Checkpoint policy

No public repository, push, deployment or final event submission until the owner authorizes it. All commits are kept.
