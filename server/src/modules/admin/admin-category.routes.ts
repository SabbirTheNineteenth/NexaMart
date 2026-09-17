import { Hono, type Context } from "hono";
import { z } from "zod";
import { createAuthGuard, getAuthenticatedAccount } from "../auth/auth.guard.js";
import type { PublicAccount } from "../auth/auth.types.js";
import { CategoryConflictError, type AdminCategory, type AdminCategoryInput, type AdminCategoryUpdate } from "./admin-category.repository.js";

const categoryDetailsSchema = z.object({
  name: z.string().trim().min(1).max(80),
  slug: z.string().trim().min(1).max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
});
const categoryUpdateSchema = categoryDetailsSchema.partial().refine((details) => details.name !== undefined || details.slug !== undefined);
type SessionResolver = { resolve(token: string): Promise<PublicAccount | null> };
type AdminCategories = {
  list(): Promise<AdminCategory[]>;
  create(input: AdminCategoryInput & { adminId: string }): Promise<AdminCategory>;
  update(input: AdminCategoryUpdate & { adminId: string }): Promise<AdminCategory>;
};

export const createAdminCategoryRoutes = ({ sessions, categories }: { sessions: SessionResolver; categories: AdminCategories }) => {
  const routes = new Hono();
  const guard = createAuthGuard(sessions);
  routes.use("*", guard.requireAccount, guard.requireRole("admin"));
  routes.get("/", async (c) => {
    try {
      return c.json({ categories: await categories.list() });
    } catch {
      return c.json({ error: "Unable to list categories" }, 500);
    }
  });
  routes.post("/", async (c) => {
    const parsed = categoryDetailsSchema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return c.json({ error: "Invalid category" }, 400);
    try {
      return c.json({ category: await categories.create({ ...parsed.data, adminId: getAuthenticatedAccount(c)!.id }) }, 201);
    } catch (error) {
      return categoryError(c, error, "Unable to create category");
    }
  });
  routes.patch("/:categoryId", async (c) => {
    const parsed = categoryUpdateSchema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return c.json({ error: "Invalid category" }, 400);
    try {
      return c.json({ category: await categories.update({ id: c.req.param("categoryId"), ...parsed.data, adminId: getAuthenticatedAccount(c)!.id }) });
    } catch (error) {
      return categoryError(c, error, "Unable to update category");
    }
  });
  return routes;
};

const categoryError = (c: Context, error: unknown, fallback: string) => {
  if (error instanceof CategoryConflictError || error instanceof Error && error.message === "Category slug already exists") return c.json({ error: "Category slug already exists" }, 409);
  if (error instanceof Error && error.message === "Category not found") return c.json({ error: "Category not found" }, 404);
  return c.json({ error: fallback }, 500);
};
