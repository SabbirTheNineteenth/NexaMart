import type { WishlistRepository } from "../wishlist.repository.js";
import { ProductUnavailableError } from "../../cart/services/cart-service.js";

export class WishlistService {
  constructor(private readonly repository: WishlistRepository) {}

  async list(accountId: string) {
    return this.repository.list(accountId);
  }

  async add(input: { accountId: string; productId: string }) {
    if (!await this.repository.isProductEligible(input.productId)) throw new ProductUnavailableError();
    await this.repository.add(input);
  }

  async remove(input: { accountId: string; productId: string }) {
    await this.repository.remove(input);
  }
}
