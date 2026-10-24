---
assurance:
  id: t-3
  base: sha256:110236eab58ab8e617d9014bd35715846e8f4eba39af5cb2ca1b67894e8cb75b
---
# Valid booking shows PL-4821 for five seconds

> From the home page, open the form, use visibly labeled visitor fields and stated date format, select each offered native arrival-time option with waiver ticked, and see PL-4821 persist for five seconds without visitor action.

## Step 1 @verifies ac-8, ac-9

Start at http://localhost:4101 on the Pitchline home page; inspect the booking-labeled controls and use the clearly labeled free-first-visit entry to open the booking form, then assert there is one clearly labeled home-page entry that opens the form and every booking-labeled control leads to that form.

## Step 2 @verifies ac-10, ac-11

On the Pitchline booking journey, if a cookie notice or pop-up covers the page, dismiss it by its real labeled button and return to the booking form, then assert the covering notice or pop-up is dismissible with that button and the booking form remains usable.

## Step 3 @verifies ac-12, ac-13, ac-14, ac-15

On the booking form, inspect the visitor-name and email fields, visit-date control and native arrival-time control, then assert the name and email have visible labels, the date control states its expected format, and the native arrival-time control offers 9am, 12pm (noon), and 6pm.

## Step 4 @verifies ac-5

On the Pitchline free-first-visit booking form, prepare the visit with {{visitor_name}}, {{visitor_email}}, {{visit_date}} in the displayed date format and 9am as the arrival time; tick the native climbing-waiver checkbox, then assert it is ticked before confirmation.

## Step 5 @verifies ac-6, ac-7

Submit the completed Pitchline free-first-visit booking and leave the confirmation panel untouched for five seconds, then assert the panel includes PL-4821 and is still visible after at least five seconds without visitor action.

## Step 6 @verifies ac-5, ac-6, ac-7

For the remaining native arrival-time choices, 12pm (noon) and 6pm, repeat the Pitchline free-first-visit booking journey with {{visitor_name}}, {{visitor_email}}, {{visit_date}} in the displayed date format and the waiver ticked, leaving each resulting confirmation untouched for five seconds, then assert each confirmation includes PL-4821 and remains visible for at least five seconds without visitor action.
