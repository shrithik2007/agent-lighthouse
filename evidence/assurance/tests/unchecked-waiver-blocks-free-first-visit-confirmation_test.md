---
assurance:
  id: t-1
  base: sha256:44344718b77e39e443afd9c1e2e13ec0e99d545b198f98d9a09d8b0a8c8b40b8
---
# Unchecked waiver blocks free-first-visit confirmation

> Submit otherwise valid visitor details with the climbing-waiver checkbox unchecked; confirmation stays absent and the waiver is named in feedback.

## Step 1

Start at http://localhost:4101 and reach the free-first-visit booking form from the Pitchline home page.

## Step 2 @verifies ac-12, ac-13, ac-14, ac-15

On the booking form, inspect the visitor-name and email fields, the visit-date control and the native arrival-time control, then assert the name and email have visible labels, the date control states its expected format, and the native arrival-time control offers 9am, 12pm (noon), and 6pm.

## Step 3 @verifies ac-1, ac-2

On the Pitchline free-first-visit booking form, enter {{visitor_name}} as the name, {{visitor_email}} as the valid email and {{visit_date}} as the visit date in the control's displayed format, choose 9am, leave the climbing-waiver checkbox unticked, and submit, then assert no booking confirmation appears and a message names the waiver.
