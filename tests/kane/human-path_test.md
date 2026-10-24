---
mode: testing
max_steps: 50
timeout: 180
target: chrome
headless: true
---

# Session: human-path

## Step 1
Go to http://localhost:4101. Open the booking form for a free first visit. Enter the name Sam Rivera and the email sam@example.com, choose the visit date 2 November 2026 and the arrival time noon, accept the climbing waiver and confirm the booking. Wait 5 seconds, then verify the text PL-4821 is still visible on the page.
