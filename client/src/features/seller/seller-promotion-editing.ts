export type SellerPromotionEditFields = {
  name: string;
  discountPercent: string;
  startsAt: string;
  endsAt: string;
};

export type SellerPromotionUpdate = {
  name: string;
  discountPercent: number;
  startsAt: string;
  endsAt: string;
};

function isValidDate(value: string): boolean {
  return value.trim() !== "" && !Number.isNaN(new Date(value).valueOf());
}

export function validateSellerPromotionUpdate(fields: SellerPromotionEditFields): string | undefined {
  const name = fields.name.trim();
  const discountPercent = Number(fields.discountPercent);
  const startsAt = new Date(fields.startsAt);
  const endsAt = new Date(fields.endsAt);

  if (name.length < 2 || name.length > 120) return "Promotion name must be between 2 and 120 characters.";
  if (!Number.isFinite(discountPercent) || discountPercent <= 0 || discountPercent > 100) return "Discount percentage must be greater than 0 and no more than 100.";
  if (!isValidDate(fields.startsAt)) return "Enter a valid start date and time.";
  if (!isValidDate(fields.endsAt)) return "Enter a valid end date and time.";
  if (endsAt <= startsAt) return "Promotion must end after it starts.";
}

export function buildSellerPromotionUpdate(fields: SellerPromotionEditFields): SellerPromotionUpdate {
  return {
    name: fields.name.trim(),
    discountPercent: Number(fields.discountPercent),
    startsAt: new Date(fields.startsAt).toISOString(),
    endsAt: new Date(fields.endsAt).toISOString(),
  };
}
