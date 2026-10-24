# Agent Lighthouse

Kane measures booking friction. OpenAI proposes repairs. Kane verifies the change before the owner reviews it.

**Track:** Web App · **Team:** Lighthouse · **Built:** October 24, 2026, Kane CLI Hack Day SF.

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

## Run locally

Requires Node.js 24.15+ LTS and npm (Node 22.22.2+ and 26+ also work). The fix loop and measurements also need Google Chrome, `kane-cli` 0.10.0-rc (signed in), the event's `kanehack` helper, the `codex` CLI and an OpenAI API key.

```sh
npm ci
npm test                    # unit, jsdom and stream-parser tests (no network)
npm run serve               # :4101 BEFORE / working copy (site/), :4102 AFTER reference fix
npm run dashboard           # :4100 audit report from results/latest.json (?recorded=1 for demo-backup.json)

# Measure a page: 3 fresh wrapped Kane runs
node lighthouse/measure.mjs http://localhost:4101 3

# Full loop (Kane always runs from your own shell, never inside a Codex sandbox)
export OPENAI_API_KEY=...   # read from the environment only; never written or printed
OPENAI_MODEL=gpt-5.5 npm run loop -- --flow book --threshold 80 --max-attempts 3 --mode propose   # or --mode apply
npm run report              # rebuild results/latest.json
npm run demo:reset          # restore site/index.html from BEFORE (results and evidence kept)
```

Pitchline is fictional. Both pages run entirely in the browser and create no real appointments.

## Project layout

```text
fixtures/before/index.html   Immutable baseline with the six planted problems
fixtures/after/index.html    Reference fix that repairs each problem
site/index.html              Editable working copy served on :4101; the loop's fixer edits only this
flows/book.json              Objective, human-path objective, optimalSteps=10 and its reasoning
core/score.mjs               Pure score, comparison, gate and Agent Tax functions
lighthouse/kane.mjs          Wrapped Kane launcher (kanehack report → kane-cli run), raw capture
lighthouse/parse.mjs         NDJSON stream → observation (steps, actions vs overhead, failures, credits)
lighthouse/loop.mjs          Fix loop: diagnosis → fixer → scope guard → re-measure → human path → gate
lighthouse/openai.mjs        OpenAI Responses client; logs every call to results/openai-calls.jsonl
dashboard/                   Vanilla one-page audit report
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
- The first calibration run exited 2 because Kane was launched inside Codex's sandbox (EPERM on `~/.testmuai`, Chrome never started). Kane now always runs from the operator's shell.

## Checkpoint policy

No public repository, push, deployment or final event submission until the owner authorizes it. All commits are kept.
