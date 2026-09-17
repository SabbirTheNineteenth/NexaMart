import { calculatePromotionPrice, selectActiveProductPromotion, type ActiveProductPromotion } from "../promotions/promotion-pricing.js";

export type PublicPromotion = { id: string; name: string; discountPercent: number; endsAt: Date };

export type Product = {
  id: string;
  slug: string;
  name: string;
  brand?: string;
  category: string;
  price: number;
  originalPrice?: number;
  basePrice?: number;
  effectivePrice?: number;
  promotion?: PublicPromotion;
  rating: number;
  reviews: number;
  image: string;
  badge?: string;
  description: string;
  colors: string[];
  inStock: boolean;
  storeName?: string;
  storeSlug?: string;
};

export type PublicProductPromotion = ActiveProductPromotion & { productId: string | null };

type PriceableProduct = Omit<Product, "basePrice" | "effectivePrice" | "promotion">;

export const applyPublicPromotionPricing = <T extends PriceableProduct>(products: T[], promotions: PublicProductPromotion[], now: Date): (T & Pick<Product, "basePrice" | "effectivePrice" | "promotion">)[] => {
  const promotionsByProduct = new Map<string, PublicProductPromotion[]>();
  for (const promotion of promotions) {
    if (!promotion.productId) continue;
    const candidates = promotionsByProduct.get(promotion.productId) ?? [];
    candidates.push(promotion);
    promotionsByProduct.set(promotion.productId, candidates);
  }
  return products.map((product) => {
    const promotion = selectActiveProductPromotion(promotionsByProduct.get(product.id) ?? [], now);
    if (!promotion) return { ...product, basePrice: product.price, effectivePrice: product.price };
    const price = calculatePromotionPrice(product.price, promotion.discountPercent);
    return {
      ...product,
      basePrice: price.baseUnitPrice,
      effectivePrice: price.effectiveUnitPrice,
      promotion: { id: promotion.id, name: promotion.name, discountPercent: Number(promotion.discountPercent), endsAt: promotion.endsAt },
    };
  });
};

export type PublicGalleryImage = { imageUrl: string; altText?: string; sortOrder: number };
export type PublicProductVariant = { id: string; sku: string; options: Record<string, string>; price: number; stock: number };
export type ProductDetail = Product & { galleryImages: PublicGalleryImage[]; variants: PublicProductVariant[] };

type GalleryImageRow = { imageUrl: string; altText: string | null; sortOrder: number };
type VariantRow = { id: string; sku: string; options: Record<string, string>; price: string | number; stock: number };

type ProductDetailSource = Product & { galleryImages: GalleryImageRow[]; variants: VariantRow[] };

export const toPublicProductDetail = (source: ProductDetailSource): ProductDetail => ({
  id: source.id,
  slug: source.slug,
  name: source.name,
  ...(source.brand ? { brand: source.brand } : {}),
  category: source.category,
  price: source.price,
  basePrice: source.basePrice ?? source.price,
  effectivePrice: source.effectivePrice ?? source.price,
  ...(source.promotion ? { promotion: source.promotion } : {}),
  ...(source.originalPrice ? { originalPrice: source.originalPrice } : {}),
  rating: source.rating,
  reviews: source.reviews,
  image: source.image,
  ...(source.badge ? { badge: source.badge } : {}),
  description: source.description,
  colors: source.colors,
  inStock: source.inStock,
  ...(source.storeName && source.storeSlug ? { storeName: source.storeName, storeSlug: source.storeSlug } : {}),
  galleryImages: source.galleryImages
    .slice()
    .sort((left, right) => left.sortOrder - right.sortOrder)
    .map((image) => ({ imageUrl: image.imageUrl, ...(image.altText ? { altText: image.altText } : {}), sortOrder: image.sortOrder })),
  variants: source.variants.map((variant) => ({ id: variant.id, sku: variant.sku, options: variant.options, price: Number(variant.price), stock: variant.stock })),
});

export type Category = { name: string; count: number };
/** Public stores exclude zero-product profiles. */
export type PublicStore = { storeName: string; storeSlug: string; description?: string; productCount: number };
export type PublicStoreDetail = { store: PublicStore; products: Product[] };
