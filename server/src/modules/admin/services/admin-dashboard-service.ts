import type { AdminRepository } from "../admin.types.js";

export class AdminDashboardService {
  constructor(private readonly repository: AdminRepository) {}

  async listAccounts(limit: number) {
    const accounts = await this.repository.listAccounts(limit);
    return accounts.map((account) => ({
      id: account.id,
      name: account.name,
      email: account.email,
      role: account.role,
      createdAt: account.createdAt,
      sellerProfile: account.sellerProfile,
    }));
  }
  listProducts() { return this.repository.listProducts(); }
  listOrders() { return this.repository.listOrders(); }
  search(input: { query: string; limit: number }) { return this.repository.search(input); }
}
