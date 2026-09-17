import { Hono, type Context } from "hono";
import { z } from "zod";
import { createAuthGuard, getAuthenticatedAccount } from "../auth/auth.guard.js";
import type { PublicAccount } from "../auth/auth.types.js";
import { TaxonomyConflictError, TaxonomyNotFoundError, TaxonomyValidationError } from "./taxonomy.repository.js";

const details = z.object({ name: z.string().trim().min(1).max(120), slug: z.string().trim().min(1).max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/), categoryId: z.string().uuid().optional() });
const update = details.partial().extend({ isActive: z.boolean().optional() }).strict().refine((value) => Object.keys(value).length > 0);
const review = z.object({ decision: z.enum(["approve", "reject"]), canonicalId: z.string().uuid().optional(), reviewNote: z.string().trim().min(1).max(1000).optional() }).strict();
type Sessions = { resolve(token: string): Promise<PublicAccount | null> };
type Taxonomy = { listCanonical(): Promise<unknown>; createCanonical(input: unknown): Promise<unknown>; updateCanonical(input: unknown): Promise<unknown>; listProposals(status?: "pending" | "approved" | "rejected" | "withdrawn"): Promise<unknown>; reviewProposal(input: unknown): Promise<unknown> };
export const createAdminTaxonomyRoutes = ({ sessions, taxonomy }: { sessions: Sessions; taxonomy: Taxonomy }) => {
  const routes = new Hono(); const guard = createAuthGuard(sessions); routes.use("*", guard.requireAccount, guard.requireRole("admin"));
  routes.get("/", async (c) => safe(c, "Unable to list taxonomy", () => taxonomy.listCanonical()));
  routes.get("/proposals", async (c) => { const status = z.enum(["pending", "approved", "rejected", "withdrawn"]).optional().safeParse(c.req.query("status")); if (!status.success) return c.json({ error: "Invalid proposal status" }, 400); return safe(c, "Unable to list proposals", () => taxonomy.listProposals(status.data)); });
  for (const plural of ["categories", "subcategories", "brands"] as const) {
    const nodeKind = ({ categories: "category", subcategories: "subcategory", brands: "brand" } as const)[plural];
    routes.post(`/${plural}`, async (c) => { const parsed = details.safeParse(await c.req.json().catch(() => null)); if (!parsed.success || nodeKind === "subcategory" && !parsed.data.categoryId) return c.json({ error: "Invalid taxonomy node" }, 400); try { return c.json({ node: await taxonomy.createCanonical({ kind: nodeKind, ...parsed.data, adminId: getAuthenticatedAccount(c)!.id }) }, 201); } catch (error) { return errorResponse(c, error, "Unable to create taxonomy node"); } });
    routes.patch(`/${plural}/:id`, async (c) => { const parsed = update.safeParse(await c.req.json().catch(() => null)); if (!parsed.success) return c.json({ error: "Invalid taxonomy node" }, 400); try { return c.json({ node: await taxonomy.updateCanonical({ kind: nodeKind, id: c.req.param("id"), ...parsed.data, adminId: getAuthenticatedAccount(c)!.id }) }); } catch (error) { return errorResponse(c, error, "Unable to update taxonomy node"); } });
  }
  routes.post("/proposals/:proposalId/review", async (c) => { const parsed = review.safeParse(await c.req.json().catch(() => null)); if (!parsed.success) return c.json({ error: "Invalid proposal review" }, 400); try { return c.json({ proposal: await taxonomy.reviewProposal({ proposalId: c.req.param("proposalId"), ...parsed.data, adminId: getAuthenticatedAccount(c)!.id }) }); } catch (error) { return errorResponse(c, error, "Unable to review proposal"); } });
  return routes;
};
const safe = async (c: Context, message: string, work: () => Promise<unknown>) => { try { return c.json(await work()); } catch { return c.json({ error: message }, 500); } };
const errorResponse = (c: Context, error: unknown, fallback: string) => {
  if (error instanceof TaxonomyValidationError && taxonomyValidationMessages.has(error.message)) return c.json({ error: error.message }, 400);
  if (error instanceof TaxonomyConflictError && taxonomyConflictMessages.has(error.message)) return c.json({ error: error.message }, 409);
  if (error instanceof TaxonomyNotFoundError && taxonomyNotFoundMessages.has(error.message)) return c.json({ error: error.message }, 404);
  return c.json({ error: fallback }, 500);
};
const taxonomyValidationMessages = new Set(["Category is not active", "Canonical taxonomy node does not match proposal"]);
const taxonomyConflictMessages = new Set(["Taxonomy slug already exists"]);
const taxonomyNotFoundMessages = new Set(["Taxonomy node not found", "Proposal not found"]);
