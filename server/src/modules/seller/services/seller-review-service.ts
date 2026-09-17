import type { SellerReviewRepository } from "../seller-review.repository.js";

export class SellerReviewService {
  constructor(private readonly repository: SellerReviewRepository) {}

  async listForSeller(sellerId: string) {
    return this.repository.listForSeller(sellerId);
  }
}
