---
mode: testing
max_steps: 50
timeout: 180
target: chrome
headless: true
variables:
  global.visitor_name:
    value: ''
    secret: false
    syntax: '{{visitor_name}}'
    type: global
  global.visitor_email:
    value: ''
    secret: false
    syntax: '{{visitor_email}}'
    type: global
  global.visit_date:
    value: ''
    secret: false
    syntax: '{{visit_date}}'
    type: global
---

# Session: human-path

## Step 1
Go to http://localhost:4104. Book the free first visit class: choose that class, enter the name Sam Rivera and the email sam@example.com, pick 2 November 2026 and the arrival time noon, accept the climbing waiver, complete the human check and confirm the booking. Wait 5 seconds, then verify the text PL-7302 is still visible on the page.
