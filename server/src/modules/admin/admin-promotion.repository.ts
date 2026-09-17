import type { AdminPromotionOversight } from "./admin-promotion.routes.js";

export type AdminPromotionRepository = {
  list(): Promise<AdminPromotionOversight[]>;
};
