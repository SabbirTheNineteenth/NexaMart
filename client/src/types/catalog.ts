export type ProductGalleryImage = {
  imageUrl: string;
  altText?: string | null;
  sortOrder: number;
};

export type ProductVariant = {
  id: string;
  sku: string;
  options: Record<string, string>;
  price: number;
  stock: number;
};

export type ProductPromotion = {
  id: string;
  name: string;
  discountPercent: number;
  endsAt: string;
};

export type Product = {
  id: string;
  slug: string;
  name: string;
  category: string;
  price: number;
  basePrice?: number;
  effectivePrice?: number;
  promotion?: ProductPromotion;
  originalPrice?: number;
  rating: number;
  reviews: number;
  image: string;
  badge?: string;
  brand?: string;
  description: string;
  colors: string[];
  inStock: boolean;
  galleryImages: ProductGalleryImage[];
  variants: ProductVariant[];
  storeName?: string;
  storeSlug?: string;
};

export type PublicStore = {
  storeName: string;
  storeSlug: string;
  description?: string | null;
  productCount: number;
};

export type CartProduct = Pick<Product, "id" | "name" | "price" | "image" | "basePrice" | "effectivePrice" | "promotion">;
