# Show HN

Placeholders: [REPO_URL]

**Title:** Show HN: Agent Lighthouse – measure how hard your site makes agent bookings, then prove the fix

**URL:** [REPO_URL]

**Text:**

I built this today at a Kane CLI hackathon. The question: if an AI agent tries to book on a small business's own website (not through an OpenTable-style integration), how much extra work does it take, and can you fix that safely?

It runs Kane CLI (a natural-language browser test runner) on a booking objective three times from scratch and parses the NDJSON into a score and an "Agent Tax": extra steps, seconds and credits per successful booking, compared with a repaired page.

On a fictional climbing-gym site with six planted problems (an ambiguous "Go" button, a cookie wall with a tiny div to close it, placeholder-only fields, an undisclosed date format, div-based controls, and a confirmation toast that disappears after 2.5 s), the original page scored 51/100: 2 of 3 runs passed, median 22 steps against an optimum of 10. Kane got past most of the traps on its own. What actually failed a run was the vanishing confirmation, and Kane classified that as a confirmed product bug.

The loop sends Kane's failing remark and failing-step screenshot to the OpenAI API for a diagnosis, has Codex edit only the site's files on a branch (a scope guard reverts anything else), then re-measures with three fresh runs plus a "human path" run that checks the booking reference is still visible five seconds after confirming. A patch qualifies only if it scores at least 80 AND the human path passes. The default mode writes a PR description for the owner. It never changes a site you don't own.

Here it qualified on the first attempt: 97/100, 3/3 passed, exactly 10 actions per run, human path green.

Limits: three runs per side is a small sample and Kane varies (14–24 steps on the original). The score weights are my choice, not a validated metric. The demo site is planted and has no backend. The hackathon's run-report wrapper mislabels passing Kane 0.10 runs as "errored", so the raw streams are committed for checking.
