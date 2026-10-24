# Agent Lighthouse build plan

## Clock and checkpoints

Plan toward the user's 16:00 Pacific table evaluation, feature freeze at 15:15, and GTM work from 15:30. At 13:11 Pacific on October 24, the event server reported BUILD, submissions due at 18:00, and no hard clock locks. Its demo field listed 18:00; that does not replace the user's earlier table target.

Phase 0 is the foundation checkpoint. Stop after testing and committing it. Later phase budgets must be revised against the actual time remaining and observed Kane duration, not assume a loop fits into a short demo.

## Phase 0: foundations

- Standalone BEFORE and AFTER Pitchline pages; `site/` starts as BEFORE.
- Node static server on 4101 and 4102.
- Pure scoring functions, missing-value handling, Agent Tax and gates.
- node:test and jsdom tests of all six pitfalls and completed bookings.
- Checkpoint 0: tests pass, commit, stop. No Kane performance result yet.

## Phase 1: measured baseline

- Use the official Kane CLI skill. Preflight sign-in, RC version, Chrome and balance. Stop if unauthenticated, credits are below 300, or a run did not start.
- Verify installed `run --help`, balance, actual exit behavior and one captured NDJSON stream before trusting the adapter. Save a genuine stream fixture after checking it for secrets.
- Every Kane call gets `KANE_CLI_USER_AGENT=codex`; child kill timeout is 600 seconds.
- Check `kanehack consent status`. Obtain explicit consent before `kanehack consent yes` if absent. Verify the reporting wrapper preserves the underlying output and exit code; treat its report line as wrapper metadata, not Kane output. If it changes the contract, stop and report the direct-run alternative.
- Check the requested `--agent --headless --timeout 180` flags rather than assuming support. Three sequential fresh runs per measurement; no replay in scoring.
- Parse exit first. Count distinct completed steps with execution/child context so repeated step indices do not collapse separate work. Use the final state of each step to count failures. Parse duration and credits only from the verified contract. Preserve unknowns.
- Use the user's natural-language date: the second of November 2026, noon, Sam Rivera, sam@example.com. Do not tell the agent the ISO format.
- Hand-count optimal steps on AFTER and confirm with the user before scores. Define what an atomic step includes.
- Checkpoint 1: three real runs on each fixture; scores, per-run values, tax, evidence paths and `kanehack status`. If the intended contrast is weak, stop and offer revised friction or Agent Tax as headline. Wait.

## Phase 2: repair with owner review

- Verify `codex --help` and the supported non-interactive invocation before wiring the fixer; use the OpenAI documentation skill when implementing that integration.
- Log every product-side diagnosis/fix invocation in `results/openai-calls.jsonl`: timestamp, model, purpose, token counts if available. Record unavailable fields as null. Do not treat local unit tests as model calls.
- Default `propose` mode uses an isolated working branch/copy and leaves the patch for review. Owned-demo `apply` mode can merge after qualification. No external-site repair loop.
- Baseline includes fresh measurements plus a named human-path run checking that PL-4821 remains visible after five seconds.
- OpenAI diagnosis consumes actual failed remarks and console/network excerpts. The fixer edits only `site/`; commit each repair against the Kane failure it addresses.
- Scope guard must preserve pre-existing user work; remove only the fixer's out-of-scope changes and record them. Refuse ambiguous dirty-worktree situations rather than discarding unrelated changes.
- Re-measure and run the human path. Score at least 80 AND human-path pass qualifies for owner review. Below threshold retries; three unsuccessful attempts escalate.
- Proposal includes changes, linked failure, before/after score and tax, evidence and human-path status. Record every attempt, commit SHA and OpenAI call.
- Generate saved tests via Kane assurance, never hand-write them. Keep the human-path test and its output under `tests/kane/`; replay once for feature coverage, never performance measurement.

## Phase 3: dashboard and end-to-end checkpoint

- `results/latest.json` carries site, flow, mode, baseline, attempts, final score/tax/human path/proposal, optional real-site observations, and generation time.
- Vanilla dashboard: status, score before/after, Agent Tax, per-run dots, failed remarks and evidence, repair/commit timeline, owner review, scope guard, human path, escalation, score-only warning and artifact links.
- Empty/loading/error states, `n/a` for unknowns, low-confidence flag under three runs, recorded-run chip for genuine saved data.
- External score-only runs stop before submitting: the supplied ecommerce playground cart flow, and a booking URL supplied by the user. No real bookings or checkout submissions.
- Checkpoint 2: real apply loop works, propose writes a PR description, inspect actual JSON/dashboard, commit, stop.

## Phase 4: freeze and demo

- Exercise the full loop three times and address actual flakiness within the remaining credit/time budget.
- Preserve actual failure, green rerun and human-path packs under `evidence/`, with descriptions. Inspect packs for secrets before tracking or sharing; never publish an auth-bearing pack.
- Keep a genuine successful loop as `results/demo-backup.json`; label recorded playback.
- Three-minute table runbook: problem, failure evidence, repair/proof, owner-review proposal, variation and commits. Include an honest fallback if live Kane runs take longer.
- Video script leads with the real Kane report. Export genuine screenshots, measurements and three supported one-line facts into `gtm/`.
- Checkpoint 3: feature freeze, report, ask whether to publish.

## Publish only on explicit instruction

Run tests; scan tracked files and history for secrets; verify GitHub auth. Create a public repository and push every commit unchanged only after the user says publish. Report URL and exact HEAD. Run event submission preflight, fill the required fields, link the actual Kane runs and leave final submission to the captain in the browser. GTM and the separate shipped-prize bundle do not replace final submission requirements.
