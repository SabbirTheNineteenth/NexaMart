export type SellerProductEditFields = {
  name: string;
  brand: string;
  slug: string;
  description: string;
  price: string;
  primaryImageUrl: string;
  colors: string;
};

export type SellerProductUpdate = {
  name?: string;
  brand?: string;
  slug?: string;
  description?: string;
  price?: number;
  primaryImageUrl?: string;
  colors?: string[];
};

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const splitColors = (value: string) => value.split(",").map((color) => color.trim()).filter(Boolean);
const uniqueColors = (value: string) => [...new Set(splitColors(value))];

export function validateSellerProductUpdate(fields: SellerProductEditFields): string | null {
  const name = fields.name.trim();
  const brand = fields.brand.trim();
  const slug = fields.slug.trim();
  const description = fields.description.trim();
  const price = fields.price.trim();
  const primaryImageUrl = fields.primaryImageUrl.trim();
  const colors = splitColors(fields.colors);
  if (![name, brand, slug, description, price, primaryImageUrl, fields.colors.trim()].some(Boolean)) return "Enter at least one product detail to update.";
  if (name && (name.length < 2 || name.length > 180)) return "Product name must be between 2 and 180 characters.";
  if (brand && brand.length > 120) return "Brand must be 120 characters or fewer.";
  if (slug && (!slugPattern.test(slug) || slug.length < 2 || slug.length > 220)) return "Slug must be a 2–220 character URL-friendly value.";
  if (description && (description.length < 10 || description.length > 10_000)) return "Description must be between 10 and 10,000 characters.";
  if (price && (!Number.isFinite(Number(price)) || Number(price) <= 0 || Number(price) > 9_999_999_999.99)) return "Price must be greater than zero and within the supported range.";
  if (primaryImageUrl) {
    try { const url = new URL(primaryImageUrl); if (!/^https?:$/.test(url.protocol) || primaryImageUrl.length > 2_000) throw new Error(); }
    catch { return "Enter a valid image URL."; }
  }
  if (fields.colors.trim() && (!colors.length || colors.length > 12 || colors.some((color) => color.length > 80))) return "Provide between 1 and 12 colors, each up to 80 characters.";
  if (new Set(colors).size !== colors.length) return "Colors must be unique.";
  return null;
}

export function buildSellerProductUpdate(fields: SellerProductEditFields): SellerProductUpdate {
  const update: SellerProductUpdate = {};
  const name = fields.name.trim();
  const brand = fields.brand.trim();
  const slug = fields.slug.trim();
  const description = fields.description.trim();
  const price = fields.price.trim();
  const primaryImageUrl = fields.primaryImageUrl.trim();
  const colors = uniqueColors(fields.colors);
  if (name) update.name = name;
  if (brand) update.brand = brand;
  if (slug) update.slug = slug;
  if (description) update.description = description;
  if (price) update.price = Number(price);
  if (primaryImageUrl) update.primaryImageUrl = primaryImageUrl;
  if (fields.colors.trim()) update.colors = colors;
  return update;
}
