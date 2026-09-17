import type { SellerQueueRepository } from "../seller-queue.types.js";

export class SellerQueueService {
  constructor(private readonly repository: SellerQueueRepository) {}

  overview(sellerId: string) {
    return this.repository.overview(sellerId);
  }
}
