import { Hono } from "hono";
import { z } from "zod";
import { createAuthGuard, getAuthenticatedAccount } from "../auth/auth.guard.js";
import type { PublicAccount } from "../auth/auth.types.js";
import type { SellerPromotionInput } from "./seller-promotion.repository.js";

const promotionSchema = z.object({
  name: z.string().trim().min(2).max(120),
  scope: z.literal("product"),
  productId: z.string().uuid(),
  discountPercent: z.number().finite().min(0.01).max(99.99).refine((value) => Math.round(value * 100) === value * 100),
  startsAt: z.string().datetime({ offset: true }),
  endsAt: z.string().datetime({ offset: true }),
}).superRefine((input, context) => {
  if (new Date(input.endsAt) <= new Date(input.startsAt)) context.addIssue({ code: z.ZodIssueCode.custom, path: ["endsAt"], message: "Promotion must end after it starts" });
});

const promotionUpdateSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  discountPercent: z.number().finite().min(0.01).max(99.99).refine((value) => Math.round(value * 100) === value * 100).optional(),
  startsAt: z.string().datetime({ offset: true }).optional(),
  endsAt: z.string().datetime({ offset: true }).optional(),
}).strict().refine((input) => Object.keys(input).length > 0).superRefine((input, context) => {
  if (input.startsAt && input.endsAt && new Date(input.endsAt) <= new Date(input.startsAt)) context.addIssue({ code: z.ZodIssueCode.custom, path: ["endsAt"], message: "Promotion must end after it starts" });
});

type SessionResolver = { resolve(token: string): Promise<PublicAccount | null> };
type SellerPromotionUpdate = Omit<z.infer<typeof promotionUpdateSchema>, "startsAt" | "endsAt"> & { sellerId: string; promotionId: string; startsAt?: Date; endsAt?: Date };
type SellerPromotionDelete = { sellerId: string; promotionId: string };
type SellerPromotions = { create(input: SellerPromotionInput): Promise<unknown>; list(sellerId: string): Promise<unknown[]>; update(input: SellerPromotionUpdate): Promise<unknown>; delete(input: SellerPromotionDelete): Promise<void> };

const knownError = (error: unknown, messages: readonly string[]) => error instanceof Error && messages.includes(error.message) ? error.message : null;

export const createSellerPromotionRoutes = ({ sessions, promotions }: { sessions: SessionResolver; promotions: SellerPromotions }) => {
  const routes = new Hono();
  const guard = createAuthGuard(sessions);

  routes.get("/", guard.requireAccount, guard.requireRole("seller"), async (c) => {
    try {
      return c.json({ promotions: await promotions.list(getAuthenticatedAccount(c)!.id) });
    } catch {
      return c.json({ error: "Unable to load seller promotions" }, 500);
    }
  });
  routes.post("/", guard.requireAccount, guard.requireRole("seller"), async (c) => {
    const parsed = promotionSchema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return c.json({ error: "Invalid promotion" }, 400);
    try {
      return c.json({ promotion: await promotions.create({ sellerId: getAuthenticatedAccount(c)!.id, ...parsed.data, startsAt: new Date(parsed.data.startsAt), endsAt: new Date(parsed.data.endsAt) }) }, 201);
    } catch (error) {
      const message = knownError(error, ["Product not found", "Promotion schedule overlaps an existing promotion"]);
      if (message === "Promotion schedule overlaps an existing promotion") return c.json({ error: message }, 409);
      return message ? c.json({ error: message }, 404) : c.json({ error: "Unable to create promotion" }, 500);
    }
  });
  routes.patch("/:promotionId", guard.requireAccount, guard.requireRole("seller"), async (c) => {
    const parsed = promotionUpdateSchema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return c.json({ error: "Invalid promotion update" }, 400);
    const parsedPromotionId = z.string().uuid().safeParse(c.req.param("promotionId"));
    if (!parsedPromotionId.success) return c.json({ error: "Invalid promotion id" }, 400);
    try {
      const { startsAt, endsAt, ...editable } = parsed.data;
      return c.json({ promotion: await promotions.update({ sellerId: getAuthenticatedAccount(c)!.id, promotionId: parsedPromotionId.data, ...editable, ...(startsAt ? { startsAt: new Date(startsAt) } : {}), ...(endsAt ? { endsAt: new Date(endsAt) } : {}) }) });
    } catch (error) {
      const message = knownError(error, ["Promotion must end after it starts", "Promotion schedule overlaps an existing promotion", "Promotion not found"]);
      if (message === "Promotion must end after it starts") return c.json({ error: message }, 400);
      if (message === "Promotion schedule overlaps an existing promotion") return c.json({ error: message }, 409);
      if (message === "Promotion not found") return c.json({ error: message }, 404);
      return c.json({ error: "Unable to update promotion" }, 500);
    }
  });
  routes.delete("/:promotionId", guard.requireAccount, guard.requireRole("seller"), async (c) => {
    const parsedPromotionId = z.string().uuid().safeParse(c.req.param("promotionId"));
    if (!parsedPromotionId.success) return c.json({ error: "Invalid promotion id" }, 400);
    try {
      await promotions.delete({ sellerId: getAuthenticatedAccount(c)!.id, promotionId: parsedPromotionId.data });
      return c.body(null, 204);
    } catch (error) {
      const message = knownError(error, ["Promotion not found"]);
      return message ? c.json({ error: message }, 404) : c.json({ error: "Unable to delete promotion" }, 500);
    }
  });

  return routes;
};
