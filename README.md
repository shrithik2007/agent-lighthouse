# Agent Lighthouse

Kane measures booking friction. OpenAI proposes repairs. Kane verifies the change before the owner reviews it.

**Track:** Web App · **Team:** Lighthouse · **Built:** October 24, 2026, Kane CLI Hack Day SF.

## Current state

Phase 0 foundation only: two self-contained Pitchline booking pages, a working copy, a pure scoring library, and Node/jsdom tests. The Kane runner, product-side OpenAI calls, fix loop and dashboard are pending. No Kane result, readiness score, Agent Tax measurement, or repair success is claimed yet. Synthetic values in unit tests are not benchmark evidence.

## Run locally

Requires Node.js 24.15+ LTS and npm (also supports Node 22.22.2+ or 26+).

```sh
npm ci
npm test
npm run serve
```

- BEFORE / editable working copy: http://localhost:4101
- AFTER / reference fixture: http://localhost:4102
- `npm run demo:reset` restores `site/index.html` from BEFORE. It does not remove results or evidence.

Pitchline is a fictional climbing gym. Both pages operate entirely in the browser and create no real appointments. Booking details are not sent to a server.

## Project layout

```text
fixtures/before/index.html   Immutable baseline with the six planted problems
fixtures/after/index.html    Reference that repairs each problem
site/index.html              Editable copy of BEFORE, served on port 4101
core/score.mjs               Pure score, comparison, gate and Agent Tax functions
scripts/                    Local static server and reset command
tests/                      node:test unit and jsdom functional tests
docs/BUILD_PLAN.md           Remaining phases, checkpoints and integration gates
```

The pages use vanilla HTML, CSS and JavaScript. jsdom is a development-only test dependency. No frontend framework, remote fonts or third-party page scripts are used.

## The planted fixture

| BEFORE | AFTER |
| --- | --- |
| Two `Go` controls; the first opens a prices dead end | Both named `Book a free first visit` and open booking |
| Full-page cookie overlay, dismissed by an unlabeled tiny div | Compact cookie bar with an `Accept cookies` button |
| Placeholder-only name, email and date fields | Associated visible labels |
| Undisclosed ISO date requirement and `Invalid input` | Native date field, hint and field-specific errors |
| Div-based time slots and waiver | Native select and checkbox |
| Confirmation toast disappears after 2.5 seconds | Persistent status panel with reference `PL-4821` |

The fixture combines realistic interaction and accessibility pitfalls; it is not a reproduction of a published benchmark or proof that Kane will fail. [VisualWebArena](https://arxiv.org/abs/2401.13649) provides context for evaluating agents on visually grounded web tasks. W3C's guidance covers [labeling controls](https://www.w3.org/WAI/tutorials/forms/labels/), [form controls](https://www.w3.org/WAI/tutorials/forms/) and [clear success/error notifications](https://www.w3.org/WAI/tutorials/forms/notifications/). The specific dead end, tiny dismiss target and toast lifetime are deliberate demo design choices. Actual Kane failures must be observed in Phase 1.

## Scoring contract

`scoreFlow(runs, {optimalSteps})` implements the supplied formula:

```text
p = passed runs / started runs
efficiency = clamp(optimalSteps / medianSteps, 0, 1)
cleanliness = 1 - clamp(medianFailedSteps / medianSteps, 0, 1)
flakiness = 4p(1-p)
score = round(100p × (0.50 + 0.20 efficiency + 0.15 cleanliness + 0.15(1-flakiness)))
```

Medians use passing runs when any exist; otherwise they use all started runs. A timeout is an explicit failed observation with a timeout flag. A run that never started is rejected as score input. Missing measurements remain `null` and must render as `n/a`; a missing metric in any selected run leaves that median unknown. No successful run means a legitimate zero score, but no computable tax per successful booking. Fewer than three runs is low confidence.

`agentTax(runs, {optimalSteps, baselineRuns})` compares successful-run medians for steps, duration and credits with the supplied baseline, flooring each difference at zero. With only `optimalSteps`, only extra steps can be computed. Without either reference it throws. If baseline observations are supplied but contain no successes, tax stays unknown.

`scoreSite({flowName: scoreFlowResult})` equally weights the named flow scores; any unknown flow keeps the aggregate unknown. `compare(before, after)` returns signed score improvement and steps/seconds/credits saved. `gateDecision` uses one-based attempt numbers and returns `pass`, `retry` or `escalate`; the future loop must separately enforce a passing human-path run. A score alone never qualifies a patch.

## Submission fields

| Field | Value / current status |
| --- | --- |
| Project name and type | Agent Lighthouse · Web App |
| One-line pitch | Measure how agents book, propose fixes for what trips them, and prove the fixes before an owner accepts them. |
| Repository | n/a; local only until explicit publish approval |
| Exact submission commit | n/a; obtain with `git rev-parse HEAD` after the approved publish |
| Live URL or run command | `npm ci && npm run serve` currently serves the fixtures; full product command pending |
| Linked Kane run report | n/a; no run registered by this build yet; [team Proof tab](https://kaneclihack.sh/t/lighthouse/proof) |
| Harness | Planned: fresh goal-driven booking runs plus a scripted human path; confirmation `PL-4821` remains visible after five seconds; failing remarks and evidence brief the OpenAI fixer, followed by new measurements |
| Kane components used | None verified by this build yet. Planned: `run`, named saved test, `testmd` replay, evidence packs and local evidence viewer |
| OpenAI | Codex builds the code. Product diagnosis/fixer integration and `results/openai-calls.jsonl` are pending |
| Evidence packs | n/a; selected real failure, green rerun and human-path packs will go under `evidence/` |

Known limitations: weights are a design choice, not a validated metric; optimal steps will be hand-counted and confirmed; the demo site has planted patterns and no booking backend; Kane varies run to run; repeated fresh measurements are required; the future fix loop is limited to owned sites. Public-site score-only runs stop before submitting and cannot prove completed bookings. Replays will not be included in measurements. Saved-test healing behavior and installed CLI contracts must be verified before being described as observed capabilities.

## Checkpoint policy

Stop at each requested checkpoint and report what actually ran. No GitHub repository, remote, push, public deployment or final event submission until authorized. Keep all commits. See [the build plan](docs/BUILD_PLAN.md) for the remaining work.
