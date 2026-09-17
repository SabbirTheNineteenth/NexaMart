import type { CartItem } from "./cart.reducer";

export function checkoutItems(items: CartItem[]) {
  return items.map(({ id, productId, variantId, quantity }) => ({ productId: productId ?? id, ...(variantId ? { variantId } : {}), quantity }));
}

export function checkoutPayload(items: CartItem[], shippingAddressId: string) {
  return { shippingAddressId, items: checkoutItems(items) };
}
