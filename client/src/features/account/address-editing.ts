export type AddressEditFields = {
  recipientName: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  region: string;
  postalCode: string;
  country: string;
};

export function buildAddressUpdate(fields: AddressEditFields) {
  const line2 = fields.line2.trim();
  const region = fields.region.trim();
  const postalCode = fields.postalCode.trim();
  return {
    recipientName: fields.recipientName.trim(),
    phone: fields.phone.trim(),
    line1: fields.line1.trim(),
    line2: line2 || null,
    city: fields.city.trim(),
    region: region || null,
    postalCode: postalCode || null,
    country: fields.country.trim().toUpperCase(),
  };
}

export function validateAddressUpdate(fields: AddressEditFields): string | undefined {
  const update = buildAddressUpdate(fields);
  if (update.recipientName.length < 2) return "Enter a recipient name with at least 2 characters.";
  if (update.phone.length < 5) return "Enter a phone number with at least 5 characters.";
  if (update.line1.length < 2) return "Enter an address with at least 2 characters.";
  if (update.city.length < 2) return "Enter a city with at least 2 characters.";
  if (!/^[A-Z]{2}$/.test(update.country)) return "Enter a two-letter country code.";
}
