# X post (thread of 3)

Placeholders: none

Attach to 1/: `screenshots/dashboard-row1.png`. Tag @kane_cli. No exclamation marks.

---

1/
Kane CLI booked our demo gym's page 2 of 3 times. The third run failed: the confirmation vanished after 2.5 s.

Even the passing runs paid an Agent Tax: +10 steps, +84 s and 2.9× the credits per booking.

Agent Lighthouse, built today at #KaneCLIHackDay with @kane_cli. 51 → 97.

2/
How it works: Kane measures with 3 fresh runs. OpenAI diagnoses from Kane's failing step and screenshot. Codex patches only the site. Kane proves it with 3 more runs plus a human-path run. The owner gets a PR.

REA then read the page's own scripts and found the same 2.5 s timer.

3/
On a harder site the coding agent passed Kane by deleting the human check and hard-coding the test date. Owner review caught it. A fixture-leak check now blocks that, and a clean fix qualified at 95.

Every Kane run is in the repo: https://github.com/shrithik2007/agent-lighthouse

---

Lengths (X counts any URL as 23): 278, 279, 255. All under 280.
