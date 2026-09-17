import type { CartItemIdentity, CartRepository } from "../cart.repository.js";

type CartInput = CartItemIdentity & { accountId: string; quantity: number };

export class ProductUnavailableError extends Error {
  constructor() {
    super("A product or variant is unavailable");
    this.name = "ProductUnavailableError";
  }
}

export class CartService {
  constructor(private readonly repository: CartRepository) {}

  async listItems(accountId: string) {
    return this.repository.listItems(accountId);
  }

  async addItem(input: CartInput) {
    if (!Number.isInteger(input.quantity) || input.quantity < 1) throw new Error("Invalid quantity");
    const identity = this.identity(input);
    const stock = await this.repository.availableStock(identity);
    const existing = await this.repository.existingQuantity({ accountId: input.accountId, ...identity });
    if (stock === null) throw new ProductUnavailableError();
    if (stock < existing + input.quantity) throw new Error("Insufficient stock");
    await this.repository.setQuantity({ accountId: input.accountId, ...identity, quantity: existing + input.quantity });
  }

  async clear(accountId: string) {
    await this.repository.clear(accountId);
  }

  async removeItem(input: CartItemIdentity & { accountId: string }) {
    await this.repository.removeItem({ accountId: input.accountId, ...this.identity(input) });
  }

  async setQuantity(input: CartInput) {
    if (!Number.isInteger(input.quantity) || input.quantity < 0) throw new Error("Invalid quantity");
    const identity = this.identity(input);
    if (input.quantity > 0) {
      const stock = await this.repository.availableStock(identity);
      if (stock === null) throw new ProductUnavailableError();
      if (stock < input.quantity) throw new Error("Insufficient stock");
    }
    await this.repository.setQuantity({ accountId: input.accountId, ...identity, quantity: input.quantity });
  }

  private identity(input: CartItemIdentity): CartItemIdentity {
    return input.variantId ? { productId: input.productId, variantId: input.variantId } : { productId: input.productId };
  }
}
