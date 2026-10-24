---
assurance:
  id: t-5
  base: sha256:411826eaf06f73bca1bafc6eced2630ed1228a1797a24a531c9fd4b0e7537bc0
---
# Booking-labeled home controls reach the booking form

> Inspect the home page's clearly labeled form entry and every booking-labeled control, checking that no booking-labeled route leads elsewhere.

## Step 1

Start at http://localhost:4101 on the Pitchline home page and identify its clearly labeled entry to the free-first-visit booking form and every booking-labeled control.

## Step 2 @verifies ac-8

From the Pitchline home page, follow the clearly labeled free-first-visit booking entry, then assert exactly one clearly labeled home-page control opens the booking form.

## Step 3 @verifies ac-9

From the Pitchline home page, follow every control labeled for booking, returning to the home page between routes, then assert every booking-labeled control leads to the booking form and none leads elsewhere.
