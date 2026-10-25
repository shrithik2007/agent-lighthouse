# Evidence

Everything here comes from real Kane CLI 0.10.0-rc.3 runs on October 24, 2026, launched from the operator's shell through `kanehack report -- kane-cli run "<objective>" --agent --headless --timeout 180`. Home-directory paths are redacted to `~` in the text files here and in `results/`. The sealed `.evidence` packs are copied unmodified and were checked for credentials before commit: the `secrets` fields are empty and there are no tokens or keys. They do contain the operator's macOS username inside local file paths.

## Key packs (`packs/`)

Open any of them with `kane-cli evidence serve evidence/packs/<file>.evidence`. It runs locally, uploads nothing and prints a viewer URL.

| Pack | Run | What it shows |
| --- | --- | --- |
| `KR-133-before-failed.evidence` | BEFORE, baseline run 1 | **The failure Kane caught.** Step 14 fails `assert: a booking confirmation with a reference code is shown`. Kane triages it as `confirmed_product_bug`: "Free-visit confirmation does not appear after submission". The screenshot shows the filled form with no confirmation because the toast disappeared after 2.5 s. |
| `KR-148-human-path-before-failed.evidence` | BEFORE, human path | The guard fails on the original page: `assert: the text PL-4821 is still visible on the page` after waiting five seconds. |
| `KR-150-after-repair-passed.evidence` | Repaired page (`94a7f80`), run 1 | **The green rerun.** The same objective passes in 13 steps (10 actions) and the reference PL-4821 is stored. |
| `KR-153-human-path-after-repair-passed.evidence` | Repaired page, human path | The guard passes: PL-4821 is still visible five seconds after booking. |
| `KR-190-hard-before-captcha.evidence` | Case 2 BEFORE, baseline run 1 | **Kane stops at the fake captcha.** It clears the newsletter modal, cookie wall, month navigation and hover-only dropdown, then fails with `blocker.captcha`: Kane will not pretend to be human. |
| `KR-194-hard-human-path-before-failed.evidence` | Case 2 BEFORE, human path | The guard fails on the original hard-mode page, also at the captcha. |
| `KR-196-hard-after-proposed-passed.evidence` | Case 2 first loop, attempt 1 (`134e5b8`), run 1 | Passes, but this is the patch the owner review rejected: it removed the human check and hard-coded the test date. Kept as the record of the gate being fooled. |
| `KR-206-hard-human-path-after-passed.evidence` | Case 2 first loop, attempt 1, human path | Passes on the same rejected patch, which is why the fixture-leak check was added. |

## Every run (`runs/<label>/`)

Each folder has `stream.ndjson` (Kane's stdout, unchanged except for path redaction), `stderr.txt` (Kane's stderr plus the `kanehack` wrapper's report lines), `run_end.json` (the terminal event, pretty-printed) and `test_url.txt` (the Test Manager link). `range-replay-KR-170` is a `testmd` replay, so it has `test_md_done.json` instead of a Test Manager link; both of its JSON files are extracted unchanged from its stream.

| Folder | Kane run | Page | Result |
| --- | --- | --- | --- |
| `baseline-before-1` | KR-133 | BEFORE :4101 | failed: confirmation assertion (`failing-step.jpg` is Kane's screenshot) |
| `baseline-before-2` | KR-136 | BEFORE :4101 | passed, 20 steps (17 actions) |
| `baseline-before-3` | KR-137 | BEFORE :4101 | passed, 24 steps (18 actions) |
| `baseline-after-1..3` | KR-139, KR-140, KR-141 | Reference fix :4102 | passed, 12/15/12 steps (10 actions each) |
| `loop-2026-10-24T21-11-48-baseline-human-path` | KR-146 | BEFORE | failed (first loop, later aborted) |
| `loop-2026-10-24T21-17-14-baseline-human-path` | KR-148 | BEFORE | failed: PL-4821 not visible after 5 s |
| `loop-2026-10-24T21-17-14-a1-1..3` | KR-150, KR-151, KR-152 | Attempt 1 :4103 | passed, 13/12/11 steps (10 actions each) |
| `loop-2026-10-24T21-17-14-a1-human-path` | KR-153 | Attempt 1 :4103 | passed |
| `loop-2026-10-24T21-25-00-baseline-human-path` | KR-154 | BEFORE | failed (propose-mode loop) |
| `loop-2026-10-24T21-25-00-a1-1..3` | KR-156, KR-157, KR-159 | Propose attempt 1 :4103 (`6c8bed1`, unmerged) | passed, 13/17/14 steps |
| `loop-2026-10-24T21-25-00-a1-human-path` | KR-160 | Propose attempt 1 | passed |
| `loop-2026-10-24T21-35-03-baseline-human-path` | KR-161 | BEFORE | failed (hardening apply loop) |
| `loop-2026-10-24T21-35-03-a1-1..3` | KR-162, KR-164, KR-165 | Hardening attempt 1 :4103 (`81918da`, applied) | passed, 13/14/19 steps |
| `loop-2026-10-24T21-35-03-a1-human-path` | KR-166 | Hardening attempt 1 | passed |
| `range-human-path-4101` | KR-169 | Repaired `site/` :4101 (`81918da`) | passed: named run that produced `tests/kane/human-path_test.md` |
| `range-replay-KR-170` | KR-170 | Repaired `site/` :4101 | **replay** of `tests/kane/human-path_test.md` with `kane-cli testmd run`: passed in 12 s. Shown as PASSED (VERIFIED) on the Proof tab, because the wrapper reads `testmd` streams correctly. For feature coverage only; replays are never scored. |
| `hard-baseline-1..3` | KR-190, KR-191, KR-193 | Case 2 BEFORE :4103 | failed, all three `blocker.captcha` (`hard-baseline-1/failing-step.jpg` is Kane's screenshot) |
| `loop-2026-10-24T22-22-59-baseline-human-path` | KR-194 | Case 2 BEFORE | failed: `blocker.captcha` |
| `loop-2026-10-24T22-22-59-a1-1..3` | KR-196, KR-202, KR-204 | Case 2 first loop, attempt 1 (`134e5b8`) | passed; **owner review rejected the patch** (removed the human check, hard-coded the date) |
| `loop-2026-10-24T22-22-59-a1-human-path` | KR-206 | Case 2 first loop, attempt 1 | passed (same rejected patch) |
| `loop-2026-10-24T22-48-42-baseline-human-path` | KR-216 | Case 2 BEFORE | failed: `assertion_error.final_verification` |
| `loop-2026-10-24T22-48-42-a1-1..3` | KR-218, KR-220, KR-223 | Case 2 second loop, attempt 1 (`226a15e`) | passed; **blocked as suspect** by the fixture-leak check |
| `loop-2026-10-24T22-48-42-a1-human-path` | KR-225 | Case 2 second loop, attempt 1 | passed (still blocked as suspect) |
| `loop-2026-10-24T22-48-42-a2-1..3` | KR-226, KR-230, KR-231 | Case 2 second loop, attempt 2 (`72c3a14`, unmerged proposal) | passed; leak check clean, qualified at 95 |
| `loop-2026-10-24T22-48-42-a2-human-path` | KR-235 | Case 2 second loop, attempt 2 | passed |
| `worst-baseline-1..3` | KR-243, KR-244, KR-247 | Case 3 BEFORE :4104 | passed, but with a median of 33 steps against 14 optimal |
| `loop-2026-10-24T23-26-10-baseline-human-path` | KR-249 | Case 3 BEFORE | passed (case 3 slows Kane down without blocking it) |
| `loop-2026-10-24T23-26-10-a1-1..3` | KR-255, KR-258, KR-262 | Case 3 propose loop, attempt 1 (`34e32a9`, unmerged) | passed; qualified at 91 |
| `loop-2026-10-24T23-26-10-a1-human-path` | KR-264 | Case 3 propose loop, attempt 1 | passed |

Loop records, with diagnoses, Codex briefs and gate decisions, are in `results/loop/<id>.json`. Case 2 and case 3 baselines, latest results and proposals are in `results/cases/hard/` and `results/cases/worst/`. The Kane assurance loop (ingest, owner answer, review, designed tests, cover) is in `assurance/` with its own README.

## Proof tab label

The event's Proof tab (https://kaneclihack.sh/t/lighthouse/proof) lists these runs. Passing runs appear there as **"errored"** because the `kanehack report` wrapper misreads Kane 0.10's `coverage` event as an assurance stream and ignores `run_end` (help ticket H-0011; see the README's limitations). The exit code and `run_end` in each folder above are the authoritative results.
