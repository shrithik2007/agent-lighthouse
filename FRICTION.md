# Case 3: friction patterns and their sources

Every pattern planted in `fixtures/worst/index.html` comes from published agent-failure research. Each was read before citing; the wording below matches the source. A careful human can still complete the booking (`tests/worst.test.mjs`).

| Pattern on the page | What the source says | Source |
| --- | --- | --- |
| Consent modal in a same-origin iframe that traps focus and locks page scroll until answered | "sites whose consent banner blocked page scroll until dismissed completed 38% of runs" (non-blocking banners: 79%). "Consent modals, bot challenges, and gated pricing accounted for 76% of every failed run." | [maxaeo.ai: AI agents blocked by cookie banners](https://maxaeo.ai/blog/ai-agents-blocked-cookie-banners/) |
| Two overlapping modals: a newsletter offer on top of a location request whose Accept must be clicked | "Two modals overlap and the active focus is on the lower one; the agent clicks the upper one." Newsletter signup and location request are two of its "seven canonical modals". | [Future AGI: evaluating browser-use agents (2026)](https://futureagi.com/blog/evaluating-browser-use-agents-2026/) |
| A required "Choose your location" picker that pops up mid-flow | "A required pop-up selection mid-flow blocks the path the agent needs to follow" (store pickers and variant modals). | [geotoolbox.ai: agent-ready website](https://geotoolbox.ai/blog/agent-ready-website) |
| Time slots drawn on a canvas with no DOM nodes (a visually hidden radio list is the accessible fallback) | "A canvas is exposed as a bitmap rather than as the individual text, controls and relationships painted inside it." Test PERC-025, "Canvas drawing app with no DOM nodes": ~24% success (Nov 2025), ~34% (Mar 2026), approximate. | [MERJ: agent interaction research](https://merj.com/blog/agent-interaction-research) |
| The submit button three screens down, past filler content | "anything an agent must scroll three screens to find is, functionally, not on your page". This is the author's generalization; the study it cites says agents "essentially never scrolled beyond two viewports". | [maxaeo.ai](https://maxaeo.ai/blog/ai-agents-blocked-cookie-banners/) |
| The confirmation appears 4 s after submit, via JavaScript | "even agents that do render JS miss content that loads too late". | [geotoolbox.ai](https://geotoolbox.ai/blog/agent-ready-website) |

No captcha on this page; case 2 covers human verification.
