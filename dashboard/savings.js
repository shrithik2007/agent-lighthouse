// Savings use credits as Kane reports them (run_end.credits_consumed), never tokens.
// A dollar figure exists only when the viewer supplies their own rate; no price is assumed.
export function savings({ agentTax, before, after }, bookings, rate) {
  const saved = agentTax?.extraCredits ?? null;
  // Without a computable tax (no successful booking before), a credit ratio would compare failed runs: unknown.
  const ratio = saved != null && before?.medianCredits != null && after?.medianCredits > 0 ? before.medianCredits / after.medianCredits : null;
  const monthly = saved != null && Number.isFinite(bookings) && bookings >= 0 ? saved * bookings : null;
  const dollars = monthly != null && Number.isFinite(rate) && rate > 0 ? monthly * rate : null;
  return { saved, ratio, monthly, dollars };
}
