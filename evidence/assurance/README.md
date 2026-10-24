# Kane assurance loop (stretch)

From this shell, on October 24, 2026, with kane-cli 0.10.0-rc.3:

1. `docs/requirements.md`: six short booking requirements (R1–R6) for the Pitchline demo site.
2. `kane-cli context ingest docs/requirements.md --mode agent` (`01-ingest.ndjson`): the source was ingested (`source_id: requirements`) and extraction began (1.81 credits so far). Kane added `.context/` (its local store) to `.gitignore`.
3. **Paused at a requirements question** (`01-paused-question.json`, exit 3 = resumable): *"Should the booking reject past dates, or should I leave date-range restrictions unspecified because the requirements do not state one?"* (recommended: leave unspecified). This is a product decision for the owner, so the run stops here until the owner answers.

Next steps for the owner, in order:

```sh
# answer the question (option 1 = leave unspecified, the recommendation; option 2 = reject past dates)
kane-cli context extract --resume ext-20261024T223441-9f5a0bd6-requirements --mode agent --answer q1=1
# review the extracted use cases, then approve one
kane-cli context list --json --inferred
kane-cli context review --approve <use-case-ref>
# design tests for it and measure coverage
kane-cli design tests --use-case <use-case-ref> --mode agent --max 8
kane-cli cover --mode agent
```
