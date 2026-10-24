# LinkedIn post

Placeholders: [REPO_URL] · [VIDEO_URL]

Attach: `screenshots/dashboard-row1.png`. Tag the official **TestMu AI** company page by typing "@TestMu AI" and picking the page from the menu, and tag **OpenAI** the same way.

---

AI agents are starting to book things for people. ChatGPT already books restaurants through formal integrations with OpenTable, Resy and Yelp. But most small businesses only have a website. Can an agent actually book on it?

At the Kane CLI Hack Day in San Francisco I built Agent Lighthouse to answer that, and to fix it.

It runs Kane CLI against a booking flow three times from scratch and turns each run into a score and an "Agent Tax": the extra steps, seconds and credits an agent burns per successful booking.

On our demo climbing-gym site, Kane scored the original page 51/100. One run failed, and Kane filed it as a confirmed product bug: "The completed free-visit form did not show a booking confirmation or reference code after it was submitted." The confirmation was a toast that vanished after 2.5 seconds.

Then the loop:
→ the OpenAI API diagnoses the failure from Kane's remark and its failing-step screenshot
→ Codex patches only the site's files, on a branch
→ Kane re-measures with fresh runs, plus a human-path check that a person still sees the booking reference five seconds later
→ only a patch that scores 80+ and passes the human path goes to the owner for review

Result: 97/100 on the first attempt, human path green, and an Agent Tax of +10 steps, +84 seconds and +36 credits per booking removed.

What's honest about it: three runs per side is a small sample, the weights are my design choice, and the site has planted problems. Everything is in the repo: raw Kane streams, evidence packs and every OpenAI call logged.

Repo: [REPO_URL]
Demo: [VIDEO_URL]

Thanks @TestMu AI for Kane CLI and @OpenAI for the models behind the diagnosis and the fixer.

#KaneCLIHackDay #KaneCLI #AIAgents #Accessibility
