import { Hono } from "hono";
import { createAuthGuard } from "../auth/auth.guard.js";
import type { PublicAccount } from "../auth/auth.types.js";

export type AdminOrderOversight = {
  id: string;
  reference: string;
  createdAt: string;
  status: "pending" | "confirmed" | "cancelled";
  paymentStatus: "unpaid";
  total: number;
  customer: { id: string; name: string };
  items: {
    id: string;
    seller: { id: string | null; name: string | null };
    product: { id: string | null; name: string; imageUrl: string | null };
    variant?: { sku: string; options: Record<string, string> };
    quantity: number;
    unitPrice: number;
    fulfillmentStatus: "pending" | "processing" | "packed" | "shipped" | "delivered" | "cancelled" | "returned";
  }[];
};

type SessionResolver = { resolve(token: string): Promise<PublicAccount | null> };
type AdminOrders = { list(): Promise<AdminOrderOversight[]> };

export const createAdminOrderRoutes = ({ sessions, orders }: { sessions: SessionResolver; orders: AdminOrders }) => {
  const routes = new Hono();
  const guard = createAuthGuard(sessions);
  routes.use("*", guard.requireAccount, guard.requireRole("admin"));
  routes.get("/", async (c) => {
    try {
      return c.json({ orders: await orders.list() });
    } catch {
      return c.json({ error: "Unable to load admin order oversight" }, 500);
    }
  });
  return routes;
};
