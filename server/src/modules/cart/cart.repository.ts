export type CartItemIdentity = { productId: string; variantId?: string };
export type CartPromotion = { id: string; name: string; discountPercent: number };
export type CartLine = { accountId: string; productId: string; variantId?: string; quantity: number; name: string; price: number; basePrice?: number; effectivePrice?: number; promotion?: CartPromotion; image: string; variantSku?: string; variantOptions?: Record<string, string> };
export type CartLineInput = CartItemIdentity & { accountId: string; quantity: number };

export type CartRepository = {
  availableStock(input: CartItemIdentity): Promise<number | null>;
  existingQuantity(input: { accountId: string } & CartItemIdentity): Promise<number>;
  listItems(accountId: string): Promise<CartLine[]>;
  removeItem(input: { accountId: string } & CartItemIdentity): Promise<void>;
  setQuantity(input: CartLineInput): Promise<void>;
  clear(accountId: string): Promise<void>;
};
