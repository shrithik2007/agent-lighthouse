---
assurance:
  id: t-4
  base: sha256:c368b4ef3ded71d3dc2f9461a17bb22969dc45a148f3246f53102f77122e5a63
---
# Dismiss covering interruption without losing booking form

> When a cookie notice or pop-up covers the page, dismiss it with its labeled button and retain access to a usable booking form.

## Step 1

Start at http://localhost:4101 and reach the Pitchline free-first-visit booking journey while a covering cookie notice or pop-up is displayed.

## Step 2 @verifies ac-10

On the Pitchline page, dismiss the covering cookie notice or pop-up by its real labeled button and return to the booking form, then assert the covering interruption can be dismissed with that labeled button.

## Step 3 @verifies ac-11

After the covering interruption is dismissed, reach and interact with the Pitchline free-first-visit booking form, then assert the form remains usable.
