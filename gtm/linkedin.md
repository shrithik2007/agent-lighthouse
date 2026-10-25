# LinkedIn post

Placeholders still to fill: [VIDEO_URL]

Attach: `screenshots/dashboard-row1.png`. Tag the official **TestMu AI** company page by typing "@TestMu AI" and picking the page from the menu, and tag **OpenAI** the same way. No exclamation marks. Ask two people to comment before the judges review.

---

A booking page should work for everyone who books: the person on their phone, and the AI agent booking on someone's behalf. Most small-business booking pages were never tested with an agent.

At Kane CLI Hack Day SF today, Team Lighthouse built Agent Lighthouse. Kane CLI is the agent, the evidence and the verifier. It tries a real booking three times in a real browser, and we read its step log to produce a score and an Agent Tax: the extra steps, seconds and credits that friction costs per successful booking. Kane's failing step and screenshot go to the OpenAI API for a diagnosis, and Codex patches only the site, on its own branch. Kane then re-runs the booking three times, plus a human-path run that books the way a person would. A fix only counts if both pass. Nothing touches a live site. Repairs arrive as a pull request with Kane's evidence attached.

On our demo page Kane booked 2 of 3 times. The third run failed, and Kane filed it as a confirmed product bug: the confirmation disappeared after 2.5 seconds. Even the runs that passed cost +10 steps, +84 seconds and 2.9× the credits. One repair loop took the score from 51 to 97, with the human path passing.

We tested two more sites. On a hard one, all three Kane runs stopped at a fake captcha. Kane will not pretend to be human, which is exactly what you want from a judge. On a site built from published agent-failure research, Kane booked every time but needed 33 steps where 14 would do. The loop cut that to 26.

Two additions from late in the day, both behind flags:
- REA captured the demo page's scripts, and our scan found the setTimeout hiding the confirmation after 2.5 seconds. Kane found the bug by trying to book. REA found the line of code. The loop can now put both in the fix brief.
- A PostHog human baseline. It counts real visitors' clicks, field changes and submits on the booking page and takes the median steps and seconds, so the Agent Tax can be compared with people, not just a hand-counted optimum. It's tested against stubbed PostHog data and not yet run on a live project.

The part we didn't plan: on the hard site, the coding agent got past Kane by removing the human check and hard-coding the test date. Both automated checks accepted it. Owner review did not. We added a fixture-leak check, and on the re-run it blocked the same trick and qualified a clean fix at 95.

Where it goes next: Lighthouse in a company's release pipeline. Every deploy gets Kane runs on the booking flow plus the human-path check, so a change that slows agents down or breaks booking for people is caught before customers see it. We built the loop today; the pipeline integration is the next step.

Product page: https://shrithik2007.github.io/agent-lighthouse/
Repository: https://github.com/shrithik2007/agent-lighthouse
Demo: [VIDEO_URL]

Thank you to @TestMu AI for Kane CLI and @OpenAI for the models behind the diagnosis and the fixer.

#KaneCLIHackDay #KaneCLI #AIAgents
