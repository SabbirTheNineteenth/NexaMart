import type { AdminOrderOversight } from "./admin-order.routes.js";

export type AdminOrderRepository = {
  list(): Promise<AdminOrderOversight[]>;
};
