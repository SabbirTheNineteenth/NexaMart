import type { AdminPromotionRepository } from "../admin-promotion.repository.js";

export class AdminPromotionService {
  constructor(private readonly repository: AdminPromotionRepository) {}

  list() {
    return this.repository.list();
  }
}
