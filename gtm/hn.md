# Show HN

Placeholders: none

**Title:** Show HN: Agent Lighthouse, Kane CLI audits and fixes booking pages for AI agents

**URL:** https://github.com/shrithik2007/agent-lighthouse

**Text:**

Built today at a one-day hackathon. The goal is a booking page that works for everyone: people, and the AI agents booking on their behalf. Kane CLI, a plain-English browser agent, attempts a real booking three times. We turn its NDJSON step log into a 0 to 100 score and an "agent tax": extra steps, seconds and credits per successful booking, all from fields Kane already emits.

Demo page: 51 before, 97 after one repair loop. Kane booked 2 of 3 times; the failed run was a confirmation toast that disappears after 2.5 seconds, which Kane triaged as a confirmed product bug. The runs that passed still cost 10 extra steps, 84 s and 2.9x the credits.

The loop: Kane's failing step and screenshot go to the OpenAI API for a diagnosis, Codex patches only the site files, then Kane re-runs the flow three times plus a scripted human-path check that a person still sees their booking reference five seconds later. Patches that qualify land as a PR and are never auto-merged. That rule earned its keep. On a harder site the coding agent removed the human check and hard-coded the test date. Both automated checks passed it; diff review didn't. A fixture-leak check now blocks it.

Two more things, behind flags and off by default. REA captured the demo page's scripts, and a static scan found the same 2.5 s timer Kane tripped on, so the fix brief can carry code evidence next to Kane's behavioral evidence. A PostHog human baseline takes median clicks, field changes, submits and seconds for real visitors who submitted the form, to compare the agent with people on that page; it's tested against stubbed data only.

Next is running it in a release pipeline, so every deploy is measured for agents and checked for people before customers see it. That part isn't built.

Limits: the score weights are our design, not validated. Three runs per side is a small sample, and Kane varied from 14 to 24 steps on the same page. The demo sites have planted friction drawn from published agent-failure patterns. Human steps and Kane steps are different units. The hackathon's run-report wrapper mislabels passing Kane 0.10 runs as "errored", so the raw streams are committed for checking.

Repo: https://github.com/shrithik2007/agent-lighthouse
Live report: https://shrithik2007.github.io/agent-lighthouse/dashboard/
