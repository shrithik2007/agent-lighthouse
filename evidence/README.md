# Evidence

Everything here comes from real Kane CLI 0.10.0-rc.3 runs on October 24, 2026, launched from the operator's shell through `kanehack report -- kane-cli run "<objective>" --agent --headless --timeout 180`. Home-directory paths are redacted to `~` in the text files. The sealed `.evidence` packs are copied unmodified and were checked for credentials before commit: the `secrets` fields are empty and there are no tokens or keys. They do contain the operator's macOS username inside local file paths.

## Key packs (`packs/`)

Open any of them with `kane-cli evidence serve evidence/packs/<file>.evidence`. It runs locally, uploads nothing and prints a viewer URL.

| Pack | Run | What it shows |
| --- | --- | --- |
| `KR-133-before-failed.evidence` | BEFORE, baseline run 1 | **The failure Kane caught.** Step 14 fails `assert: a booking confirmation with a reference code is shown`. Kane triages it as `confirmed_product_bug`: "Free-visit confirmation does not appear after submission". The screenshot shows the filled form with no confirmation because the toast disappeared after 2.5 s. |
| `KR-148-human-path-before-failed.evidence` | BEFORE, human path | The guard fails on the original page: `assert: the text PL-4821 is still visible on the page` after waiting five seconds. |
| `KR-150-after-repair-passed.evidence` | Repaired page (`94a7f80`), run 1 | **The green rerun.** The same objective passes in 13 steps (10 actions) and the reference PL-4821 is stored. |
| `KR-153-human-path-after-repair-passed.evidence` | Repaired page, human path | The guard passes: PL-4821 is still visible five seconds after booking. |

## Every run (`runs/<label>/`)

Each folder has `stream.ndjson` (Kane's stdout, unchanged except for path redaction), `stderr.txt` (Kane's stderr plus the `kanehack` wrapper's report lines), `run_end.json` (the terminal event, pretty-printed) and `test_url.txt` (the Test Manager link).

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

| `range-human-path-4101` | KR-169 | Repaired `site/` :4101 (`81918da`) | passed: named run that produced `tests/kane/human-path_test.md` |
| `range-replay-KR-170` | KR-170 | Repaired `site/` :4101 | **replay** of `tests/kane/human-path_test.md` with `kane-cli testmd run`: passed in 12 s. Shown as PASSED (VERIFIED) on the Proof tab, because the wrapper reads `testmd` streams correctly. For feature coverage only; replays are never scored. |

Later loop runs (propose mode, hardening) add folders named `loop-<id>-*`. Their records are in `results/loop/<id>.json`.

## Proof tab label

The event's Proof tab (https://kaneclihack.sh/t/lighthouse/proof) lists these runs. Passing runs appear there as **"errored"** because the `kanehack report` wrapper misreads Kane 0.10's `coverage` event as an assurance stream and ignores `run_end` (help ticket H-0011; see the README's limitations). The exit code and `run_end` in each folder above are the authoritative results.
