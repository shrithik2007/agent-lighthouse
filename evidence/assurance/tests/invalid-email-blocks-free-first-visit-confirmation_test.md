---
assurance:
  id: t-2
  base: sha256:8cea8930935a168c1a0989243c26eed23c09936704cd8a06cf022f0d232203b7
---
# Invalid email blocks free-first-visit confirmation

> Submit otherwise valid visitor details using an invalid email address; confirmation stays absent and the email field is named in feedback.

## Step 1

Start at http://localhost:4101 and reach the free-first-visit booking form from the Pitchline home page.

## Step 2 @verifies ac-12, ac-13, ac-14, ac-15

On the booking form, inspect the visitor-name and email fields, the visit-date control and the native arrival-time control, then assert the name and email have visible labels, the date control states its expected format, and the native arrival-time control offers 9am, 12pm (noon), and 6pm.

## Step 3 @verifies ac-3, ac-4

On the Pitchline free-first-visit booking form, enter {{visitor_name}} as the name, invalid-email as the email and {{visit_date}} as the visit date in the control's displayed format, choose 12pm (noon), tick the native climbing-waiver checkbox, and submit, then assert no booking confirmation appears and a message names the email field.
