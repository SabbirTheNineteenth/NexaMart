import { Hono } from "hono";
import { z } from "zod";
import { createAuthGuard, getAuthenticatedAccount } from "../auth/auth.guard.js";
import type { PublicAccount } from "../auth/auth.types.js";
import type { SellerNotificationRepository } from "./seller-notification.repository.js";

type SessionResolver = { resolve(token: string): Promise<PublicAccount | null> };

export const createSellerNotificationRoutes = ({ sessions, notifications }: { sessions: SessionResolver; notifications: Pick<SellerNotificationRepository, "listForSeller" | "markRead"> }) => {
  const routes = new Hono();
  const guard = createAuthGuard(sessions);
  routes.use("*", guard.requireAccount, guard.requireRole("seller"));
  routes.get("/", async (c) => c.json(await notifications.listForSeller(getAuthenticatedAccount(c)!.id)));
  routes.patch("/:notificationId/read", async (c) => {
    const parsed = z.string().uuid().safeParse(c.req.param("notificationId"));
    if (!parsed.success) return c.json({ error: "Invalid notification" }, 400);
    const notification = await notifications.markRead({ sellerId: getAuthenticatedAccount(c)!.id, notificationId: parsed.data });
    return notification ? c.json({ notification }) : c.json({ error: "Notification not found" }, 404);
  });
  return routes;
};
