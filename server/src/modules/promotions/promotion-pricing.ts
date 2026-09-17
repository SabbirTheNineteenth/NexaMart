export type ActiveProductPromotion = {
  id: string;
  name: string;
  scope: "product" | "order";
  discountPercent: string | number;
  startsAt: Date;
  endsAt: Date;
  createdAt: Date;
};

const cents = (value: string | number) => {
  const match = String(value).match(/^(\d+)(?:\.(\d{1,2}))?$/);
  if (!match) throw new Error("Invalid monetary amount");
  return Number(match[1]) * 100 + Number((match[2] ?? "").padEnd(2, "0"));
};

const percentBasisPoints = (value: string | number) => {
  const match = String(value).match(/^(\d{1,2})(?:\.(\d{1,2}))?$/);
  if (!match) throw new Error("Invalid promotion discount");
  const basisPoints = Number(match[1]) * 100 + Number((match[2] ?? "").padEnd(2, "0"));
  if (basisPoints < 1 || basisPoints > 9999) throw new Error("Invalid promotion discount");
  return basisPoints;
};

export const calculatePromotionPrice = (basePrice: string | number, discountPercent: string | number) => {
  const baseCents = cents(basePrice);
  const discountBasisPoints = percentBasisPoints(discountPercent);
  const effectiveCents = Math.floor((baseCents * (10000 - discountBasisPoints) + 5000) / 10000);
  return { baseUnitPrice: baseCents / 100, effectiveUnitPrice: effectiveCents / 100 };
};

export const selectActiveProductPromotion = (promotions: ActiveProductPromotion[], now: Date): ActiveProductPromotion | null => promotions
  .filter((promotion) => promotion.scope === "product" && promotion.startsAt <= now && now < promotion.endsAt)
  .sort((left, right) => percentBasisPoints(right.discountPercent) - percentBasisPoints(left.discountPercent) || left.createdAt.getTime() - right.createdAt.getTime() || left.id.localeCompare(right.id))[0] ?? null;
