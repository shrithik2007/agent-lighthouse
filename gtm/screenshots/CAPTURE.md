# Screenshots

Generated with `sh scripts/screenshots.sh` (headless Chrome against `npm run dashboard`):

| File | What it shows |
| --- | --- |
| `dashboard-row1.png` | Dashboard Row 1: BEFORE 51 → after the loop's repair 97, change +46, Agent Tax line |
| `social-preview.png` | 1280×640 crop of the same view, for the GitHub social preview and X/LinkedIn cards |
| `dashboard-full.png` | The full one-page report |
| `proposal.png` | `results/proposal.md`, the owner-review PR description |
| `failing-step.jpg` | Kane's own screenshot at KR-133's failing step, copied unchanged from the evidence pack |

## Two shots to capture by hand

**Evidence viewer on the failing step** (`evidence-viewer.png`):
1. `kane-cli evidence serve evidence/packs/KR-133-before-failed.evidence`
2. Open the printed viewer URL. If it says "Your browser blocked access to kane-cli", click the icon left of the address bar, set **Local network access** to Allow and retry; or use "Open .evidence file" and pick the pack. Then select step 14, `assert: a booking confirmation with a reference code is shown`, so the failure and the screenshot are both visible.
3. Screenshot the browser window (Cmd+Shift+4, then Space, then click the window). Save it as `gtm/screenshots/evidence-viewer.png`. Stop the server with Ctrl+C.

**Terminal `run_end`** (`terminal-run-end.png`):
1. In a terminal at the repo root, sized about 120×30:
   `jq '{status, one_liner, duration, credits_consumed, reason_code, final_state}' evidence/runs/loop-2026-10-24T21-17-14-a1-1/run_end.json`
   (That's KR-150, the green rerun. For the failure, use `evidence/runs/baseline-before-1/run_end.json`.)
2. Screenshot the terminal window and save it as `gtm/screenshots/terminal-run-end.png`.
