import type { SellerProfileRepository } from "../seller-profile.repository.js";

export class SellerProfileService {
  constructor(private readonly repository: SellerProfileRepository) {}

  async apply(input: { accountId: string; storeName: string; storeSlug: string; description?: string }) {
    const existing = await this.repository.findByAccountId(input.accountId);
    if (existing) throw new Error("A seller application already exists");
    const storeName = input.storeName.trim();
    if (await this.repository.findByStoreName(storeName)) throw new Error("Store name already in use");
    return this.repository.createApplication({
      accountId: input.accountId,
      storeName,
      storeSlug: input.storeSlug.trim().toLowerCase(),
      ...(input.description?.trim() ? { description: input.description.trim() } : {}),
    });
  }

  getOwnProfile(accountId: string) {
    return this.repository.findByAccountId(accountId);
  }

  async updateStoreProfile(input: { accountId: string; storeName?: string; description?: string }) {
    const storeName = input.storeName?.trim();
    if (storeName) {
      const existing = await this.repository.findByStoreName(storeName);
      if (existing && existing.accountId !== input.accountId) throw new Error("Store name already in use");
    }
    const profile = await this.repository.updateStoreProfile({
      accountId: input.accountId,
      ...(storeName ? { storeName } : {}),
      ...(input.description ? { description: input.description.trim() } : {}),
    });
    if (!profile) throw new Error("Seller profile not found");
    return profile;
  }
}
