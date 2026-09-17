import type { ProductPromotion } from "@/types/catalog";
import type { CartItem } from "./cart.reducer";

export type PersistentCartLine = { productId: string; variantId?: string; quantity: number; name: string; price?: number; basePrice?: number; effectivePrice?: number; promotion?: ProductPromotion; image: string };

export function cartRemovalPath(productId: string, variantId?: string) {
  const path = `/cart/items/${encodeURIComponent(productId)}`;
  return variantId ? `${path}?${new URLSearchParams({ variantId })}` : path;
}

export const toCartItems = (items: PersistentCartLine[]): CartItem[] => items.map((item) => ({
  id: item.variantId ? `${item.productId}::${item.variantId}` : item.productId,
  ...(item.variantId ? { productId: item.productId, variantId: item.variantId } : {}),
  quantity: item.quantity,
  name: item.name,
  price: item.effectivePrice ?? item.price ?? 0,
  ...(item.basePrice !== undefined ? { basePrice: item.basePrice } : {}),
  ...(item.effectivePrice !== undefined ? { effectivePrice: item.effectivePrice } : {}),
  ...(item.promotion ? { promotion: item.promotion } : {}),
  image: item.image,
}));
