# Agent Lighthouse: 6-slide deck

Placeholders: [REPO_URL] · [VIDEO_URL]

Presentable version (Slides artifact, private until shared): https://claude.ai/artifact/GoGwobRmwDmqZnt2gQKXoT

---

## 1. Agent Lighthouse

Measure how agents book. Propose fixes for what trips them. Prove the fixes before an owner accepts them.

Team Lighthouse · Kane CLI Hack Day SF · October 24, 2026 · [REPO_URL]

> Speaker notes: One sentence, then straight to the problem. "Kane measures, OpenAI repairs, Kane proves."

---

## 2. Problem

- Agents book through formal integrations: ChatGPT uses OpenTable, Resy and Yelp.
- A small business's own website has no integration, and general web agents still fail often (Online-Mind2Web: about 61% for the best agent, about 30% for most).
- Owners can't see what an agent struggles with, or whether a fix breaks the page for people.

> Speaker notes: The gap is the long tail of small sites that will never get an integration.

---

## 3. Build

- **Measure:** 3 fresh Kane CLI runs → score + Agent Tax (extra steps, seconds, credits per booking)
- **Diagnose:** OpenAI API (gpt-5.5) reads Kane's failing remark + failing-step screenshot
- **Fix:** Codex edits only `site/` on a branch; a scope guard reverts everything else
- **Prove:** 3 fresh Kane runs + a human-path run; qualify only at score ≥ 80 **and** human path passed

> Speaker notes: Propose mode by default; apply only on sites we own.

---

## 4. Kane in the loop

- Kane's NDJSON stream is the measurement: steps (actions vs overhead), failures, duration, credits
- Kane's triage found the bug: `assert: a booking confirmation with a reference code is shown`, classified `confirmed_product_bug`
- The evidence pack's failing-step screenshot feeds the diagnosis; the human path is a named Kane run
- Every run is registered with `kanehack report` and its stream committed in `evidence/`

> Speaker notes: Kane is the judge at both ends of the loop, not just the demo-time check.

---

## 5. Demo: real numbers

| | Score | Passed | Median steps | Human path |
| --- | --- | --- | --- | --- |
| BEFORE | 51 | 2/3 | 22 | failed (KR-148) |
| After the loop's repair (attempt 1) | 97 | 3/3 | 12 (10 actions) | passed (KR-153) |

**Agent Tax removed: +10 steps · +84 s · +36 credits per booking.** Qualified on attempt 1; commit `94a7f80 fix(site): attempt 1 answers Kane KR-133`.

> Speaker notes: Show the dashboard, then the evidence viewer on KR-133 step 14. Demo video: [VIDEO_URL].

---

## 6. What's next

- **`kane-cli audit`:** one command to score any flow you own
- **Readiness badge:** a public "agent-ready" score for a site's key flows
- **CI gate:** fail a deploy that raises Agent Tax or breaks the human path
- **Agent Readiness Index:** score-only (stops before submit) across public booking pages

> Speaker notes: The loop already works; these turn it into a product owners and platforms can use.
