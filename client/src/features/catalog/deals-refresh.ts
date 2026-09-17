type DealRefreshCandidate = {
  promotion?: { endsAt: string };
};

export function millisecondsUntilNextDealRefresh(deals: readonly DealRefreshCandidate[], now = new Date()): number | undefined {
  let earliestExpiry: number | undefined;

  for (const deal of deals) {
    const endsAt = deal.promotion?.endsAt;
    if (!endsAt) continue;

    const expiry = new Date(endsAt).valueOf();
    if (Number.isNaN(expiry)) continue;
    if (earliestExpiry === undefined || expiry < earliestExpiry) earliestExpiry = expiry;
  }

  return earliestExpiry === undefined ? undefined : Math.max(0, earliestExpiry - now.valueOf());
}
