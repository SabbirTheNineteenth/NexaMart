import type { AdminOrderRepository } from "../admin-order.repository.js";

export class AdminOrderService {
  constructor(private readonly repository: AdminOrderRepository) {}

  list() {
    return this.repository.list();
  }
}
