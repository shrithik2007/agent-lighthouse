# Table demo: 3 minutes

**Setup (before judges arrive):**
- `npm run serve` (:4101 working copy, :4102 reference fix) and `npm run dashboard` (:4100).
- `npm run demo:reset` so `site/` is BEFORE again, then commit the reset.
- In one terminal, `export OPENAI_API_KEY=...`.
- Tabs, in order: 1 the dashboard http://localhost:4100 · 2 BEFORE page http://localhost:4101 · 3 the evidence viewer (`kane-cli evidence serve evidence/packs/KR-133-before-failed.evidence`, open the printed URL on step 14; allow **Local network access** for evidence.lambdatest.com once, or use "Open .evidence file") · 4 the Proof tab https://kaneclihack.sh/t/lighthouse/proof · 5 `results/proposal.md` · 6 a terminal in the repo.

| Time | Say | Show |
| --- | --- | --- |
| 0:00–0:25 | "Agents are starting to book things for people. ChatGPT books restaurants through formal integrations with OpenTable, Resy and Yelp, but most small businesses only have a website. We measure how hard that website makes it for an agent, fix what trips it, and prove the fix. We never change a site we don't own: the default is a proposal for the owner." | Tab 2: the Pitchline BEFORE page. Point at the two "Go" buttons and the cookie wall. |
| 0:25–1:05 | "Kane CLI ran this booking three times from scratch. Score 51: one run failed, and the two that passed took 17 and 18 actions where 10 is optimal. Kane didn't just fail, it filed it as a confirmed product bug: the confirmation vanishes. Here is its screenshot at the failing step: form filled, no reference." | Tab 1, Row 1 (51 → 97) and Row 3 (failing-step card). Then tab 3, the evidence viewer on step 14 with remark `assert: a booking confirmation with a reference code is shown`. |
| 1:05–2:05 | "Now the loop, live. Kane's failing remark and that screenshot go to the OpenAI API for a diagnosis. Codex patches site/ on its own branch, and a scope guard reverts anything outside site/. Then Kane measures three fresh runs again, plus a human-path run: a person's booking has to keep PL-4821 on screen after five seconds. Score 80 isn't enough on its own; the human path has to pass too." | Tab 6: `OPENAI_MODEL=gpt-5.5 npm run loop -- --flow book --mode apply`. While it runs, show tab 1, Row 4 from the recorded loop: attempt 1, commit `94a7f80`, score 97, human path passed, gate pass. |
| 2:05–2:35 | "In propose mode the same loop writes this PR description for the owner: each change, the Kane failure it answers, before and after score, Agent Tax (+10 steps, +84 seconds, +36 credits per booking on the old page) and both evidence packs." | Tab 5, `results/proposal.md`. Then tab 1, Row 5. |
| 2:35–3:00 | "It's honest about variance: BEFORE took 14 to 24 steps across runs, so we always take three fresh measurements and never score replays. Every repair is a commit naming the Kane failure it answers, and every OpenAI call is logged. The Proof tab has every run. It labels passing runs 'errored' because of a wrapper bug we reported, so the raw streams are in evidence/." | Tab 6: `git log --oneline` (show `fix(site): attempt 1 answers Kane KR-133`). Tab 4, the Proof tab. |

## Fallback if Kane is slow

A full loop takes about 6–8 minutes (four Kane runs at 50–150 s each, plus diagnosis and Codex). Don't wait on it at the table:

- Start the live loop at 1:05 and keep talking over the **recorded run**: http://localhost:4100/?recorded=1 loads `results/demo-backup.json`, from the genuine apply-mode loop `2026-10-24T21-17-14`, and shows the "Recorded run" chip. Say so out loud: "this is the recorded run from 2:17 PM; the live one is still going."
- If the network or Kane is down, use the recorded run, the evidence viewer on the committed pack (it runs locally) and `git log`. Don't claim a live result you didn't see.
- If the live loop escalates or the human path fails, show it. Row 4 highlights an attempt that scored but failed the human path, which is exactly what the guard is for.

## Reset after the demo

`npm run demo:reset`, then commit the reset. Results and evidence are kept.
