import { Hono, type Context } from "hono";
import { z } from "zod";
import { createAuthGuard, getAuthenticatedAccount } from "../auth/auth.guard.js";
import type { PublicAccount } from "../auth/auth.types.js";
import { TaxonomyConflictError, TaxonomyNotFoundError, TaxonomyValidationError } from "./taxonomy.repository.js";
const uuid = z.string().uuid();
const classification = z.object({ categoryId: uuid, subcategoryId: uuid.optional(), brandId: uuid.optional() });
const proposal = z.object({ kind: z.enum(["category", "subcategory", "brand"]), name: z.string().trim().min(1).max(120), slug: z.string().trim().min(1).max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/), categoryId: uuid.optional() }).superRefine((value, ctx) => { if (value.kind === "subcategory" && !value.categoryId) ctx.addIssue({ code: "custom", message: "categoryId is required" }); });
type Sessions = { resolve(token: string): Promise<PublicAccount | null> };
type Taxonomy = { activeOptions(): Promise<unknown>; classifyProduct(input: unknown): Promise<unknown>; submitProposal(input: unknown): Promise<unknown>; listSellerProposals(sellerId: string): Promise<unknown>; withdrawProposal(input: unknown): Promise<unknown> };
export const createSellerTaxonomyRoutes = ({ sessions, taxonomy }: { sessions: Sessions; taxonomy: Taxonomy }) => { const routes = new Hono(); const guard = createAuthGuard(sessions); routes.use("*", guard.requireAccount, guard.requireRole("seller"));
  routes.get("/options", async (c) => safe(c, "Unable to list taxonomy options", () => taxonomy.activeOptions()));
  routes.patch("/products/:productId/classification", async (c) => { const parsed = classification.safeParse(await c.req.json().catch(() => null)); if (!parsed.success) return c.json({ error: "Invalid product classification" }, 400); try { const product = await taxonomy.classifyProduct({ sellerId: getAuthenticatedAccount(c)!.id, productId: c.req.param("productId"), ...parsed.data }); return c.json({ product }); } catch (error) { return mutationError(c, error, "Unable to classify product"); } });
  routes.post("/proposals", async (c) => { const parsed = proposal.safeParse(await c.req.json().catch(() => null)); if (!parsed.success) return c.json({ error: "Invalid taxonomy proposal" }, 400); try { return c.json({ proposal: await taxonomy.submitProposal({ sellerId: getAuthenticatedAccount(c)!.id, ...parsed.data }) }, 201); } catch (error) { return mutationError(c, error, "Unable to submit proposal"); } });
  routes.get("/proposals", async (c) => safe(c, "Unable to list proposals", () => taxonomy.listSellerProposals(getAuthenticatedAccount(c)!.id)));
  routes.delete("/proposals/:proposalId", async (c) => { if (!uuid.safeParse(c.req.param("proposalId")).success) return c.json({ error: "Invalid proposal" }, 400); try { await taxonomy.withdrawProposal({ sellerId: getAuthenticatedAccount(c)!.id, proposalId: c.req.param("proposalId") }); return c.body(null, 204); } catch (error) { return mutationError(c, error, "Unable to withdraw proposal"); } });
  return routes; };
const safe = async (c: Context, message: string, work: () => Promise<unknown>) => { try { return c.json(await work()); } catch { return c.json({ error: message }, 500); } };
const mutationError = (c: Context, error: unknown, fallback: string) => {
  if (error instanceof TaxonomyValidationError && taxonomyValidationMessages.has(error.message)) return c.json({ error: error.message }, 400);
  if (error instanceof TaxonomyConflictError && taxonomyConflictMessages.has(error.message)) return c.json({ error: error.message }, 409);
  if (error instanceof TaxonomyNotFoundError && taxonomyNotFoundMessages.has(error.message)) return c.json({ error: error.message }, 404);
  return c.json({ error: fallback }, 500);
};
const taxonomyValidationMessages = new Set([
  "Category is not active",
  "Subcategory is not active",
  "Subcategory does not belong to category",
  "Brand is not active",
  "Subcategory proposal requires a category",
]);
const taxonomyConflictMessages = new Set(["Taxonomy slug already exists", "Taxonomy proposal already pending"]);
const taxonomyNotFoundMessages = new Set(["Product not found", "Proposal not found"]);
