import { Hono } from "hono";
import { z } from "zod";
import { createAuthGuard, getAuthenticatedAccount } from "../auth/auth.guard.js";
import type { PublicAccount } from "../auth/auth.types.js";
import type { SellerProfile } from "./seller-profile.repository.js";

const applicationSchema = z.object({
  storeName: z.string().trim().min(2).max(120),
  storeSlug: z.string().trim().min(2).max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  description: z.string().trim().min(10).max(2_000).optional(),
});

const storeProfileUpdateSchema = z.object({
  storeName: z.string().trim().min(2).max(120).optional(),
  description: z.string().trim().min(10).max(2_000).optional(),
}).strict().refine((input) => input.storeName !== undefined || input.description !== undefined);

type SessionResolver = { resolve(token: string): Promise<PublicAccount | null> };
type SellerProfileActions = {
  apply(input: { accountId: string; storeName: string; storeSlug: string; description?: string }): Promise<SellerProfile>;
  getOwnProfile(accountId: string): Promise<SellerProfile | null>;
  updateStoreProfile(input: { accountId: string; storeName?: string; description?: string }): Promise<SellerProfile>;
};

const knownError = (error: unknown, messages: readonly string[]) => error instanceof Error && messages.includes(error.message) ? error.message : null;
const isStoreNameUniqueViolation = (error: unknown) => typeof error === "object" && error !== null
  && "code" in error && error.code === "23505"
  && "constraint" in error && error.constraint === "seller_profiles_store_name_unique";

export const createSellerApplicationRoutes = ({ sessions, sellerProfiles }: { sessions: SessionResolver; sellerProfiles: SellerProfileActions }) => {
  const routes = new Hono();
  const guard = createAuthGuard(sessions);

  routes.get("/application", guard.requireAccount, async (c) => {
    try {
      const profile = await sellerProfiles.getOwnProfile(getAuthenticatedAccount(c)!.id);
      return profile ? c.json({ profile }) : c.json({ error: "Seller application not found" }, 404);
    } catch {
      return c.json({ error: "Unable to load seller application" }, 500);
    }
  });

  routes.post("/application", guard.requireAccount, async (c) => {
    const parsed = applicationSchema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return c.json({ error: "Invalid seller application" }, 400);
    try {
      const profile = await sellerProfiles.apply({ accountId: getAuthenticatedAccount(c)!.id, ...parsed.data });
      return c.json({ profile }, 201);
    } catch (error) {
      if (isStoreNameUniqueViolation(error)) return c.json({ error: "Store name already in use" }, 409);
      const message = knownError(error, ["A seller application already exists", "Store name already in use"]);
      return message ? c.json({ error: message }, 409) : c.json({ error: "Unable to submit seller application" }, 500);
    }
  });

  routes.patch("/profile", guard.requireAccount, guard.requireRole("seller"), async (c) => {
    const parsed = storeProfileUpdateSchema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return c.json({ error: "Invalid seller store profile" }, 400);
    try {
      const profile = await sellerProfiles.updateStoreProfile({ accountId: getAuthenticatedAccount(c)!.id, ...parsed.data });
      return c.json({ profile });
    } catch (error) {
      if (isStoreNameUniqueViolation(error)) return c.json({ error: "Store name already in use" }, 409);
      const message = knownError(error, ["Store name already in use", "Seller profile not found"]);
      if (message === "Store name already in use") return c.json({ error: message }, 409);
      if (message === "Seller profile not found") return c.json({ error: message }, 404);
      return c.json({ error: "Unable to update seller store profile" }, 500);
    }
  });

  return routes;
};
