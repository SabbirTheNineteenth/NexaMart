export type WishlistItem = { id: string; name: string; price: number; image: string };

export type WishlistRepository = {
  isProductEligible(productId: string): Promise<boolean>;
  add(input: { accountId: string; productId: string }): Promise<void>;
  remove(input: { accountId: string; productId: string }): Promise<void>;
  list(accountId: string): Promise<WishlistItem[]>;
};
