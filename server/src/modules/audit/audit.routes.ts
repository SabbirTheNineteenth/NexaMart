import { z } from "zod";
import { Hono } from "hono";
import { createAuthGuard } from "../auth/auth.guard.js";
import type { PublicAccount } from "../auth/auth.types.js";
import type { AuditListFilters, AuditRecord } from "./audit.repository.js";

const auditFiltersSchema = z.object({
  action: z.string().trim().min(1).max(128).optional(),
  resourceType: z.string().trim().min(1).max(128).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(100),
}).strict();

type SessionResolver = { resolve(token: string): Promise<PublicAccount | null> };
type AuditReader = { list(filters: AuditListFilters): Promise<AuditRecord[]> };

export const createAuditRoutes = ({ sessions, audit }: { sessions: SessionResolver; audit: AuditReader }) => {
  const routes = new Hono();
  const guard = createAuthGuard(sessions);
  routes.use("*", guard.requireAccount, guard.requireRole("admin"));
  routes.get("/", async (c) => {
    const parsed = auditFiltersSchema.safeParse(c.req.query());
    if (!parsed.success) return c.json({ error: "Invalid audit filters" }, 400);
    try {
      return c.json({ records: await audit.list(parsed.data) });
    } catch {
      return c.json({ error: "Unable to load audit records" }, 500);
    }
  });
  return routes;
};
