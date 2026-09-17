import { Hono } from "hono";
import { createAuthGuard } from "../auth/auth.guard.js";
import type { PublicAccount } from "../auth/auth.types.js";
import type { AdminAccount, AdminOrder, AdminProduct, AdminSearchResult } from "./admin.types.js";

type SessionResolver = { resolve(token: string): Promise<PublicAccount | null> };
type AdminDashboard = { listAccounts(limit: number): Promise<AdminAccount[]>; listProducts(): Promise<AdminProduct[]>; listOrders(): Promise<AdminOrder[]>; search(input: { query: string; limit: number }): Promise<AdminSearchResult[]> };

const DEFAULT_ACCOUNT_LIMIT = 50;
const MAX_ACCOUNT_LIMIT = 100;
const DEFAULT_SEARCH_LIMIT = 10;
const MAX_SEARCH_LIMIT = 25;

const parseAccountLimit = (limit: string | undefined) => {
  if (limit === undefined) return DEFAULT_ACCOUNT_LIMIT;
  if (!/^\d+$/.test(limit)) return null;
  const parsed = Number(limit);
  return parsed >= 1 && parsed <= MAX_ACCOUNT_LIMIT ? parsed : null;
};

const parseSearchLimit = (limit: string | undefined) => {
  if (limit === undefined) return DEFAULT_SEARCH_LIMIT;
  if (!/^\d+$/.test(limit)) return null;
  const parsed = Number(limit);
  return parsed >= 1 && parsed <= MAX_SEARCH_LIMIT ? parsed : null;
};

const safeAccount = (account: AdminAccount): AdminAccount => ({
  id: account.id,
  name: account.name,
  email: account.email,
  role: account.role,
  createdAt: account.createdAt,
  sellerProfile: account.sellerProfile,
});

export const createAdminRoutes = ({ sessions, dashboard }: { sessions: SessionResolver; dashboard: AdminDashboard }) => {
  const routes = new Hono();
  const guard = createAuthGuard(sessions);
  routes.use("*", guard.requireAccount, guard.requireRole("admin"));
  routes.get("/accounts", async (c) => {
    const limit = parseAccountLimit(c.req.query("limit"));
    if (limit === null) return c.json({ error: "limit must be an integer between 1 and 100" }, 400);
    try {
      return c.json({ accounts: (await dashboard.listAccounts(limit)).map(safeAccount) });
    } catch {
      return c.json({ error: "Unable to load admin accounts" }, 500);
    }
  });
  routes.get("/products", async (c) => {
    try {
      return c.json({ products: await dashboard.listProducts() });
    } catch {
      return c.json({ error: "Unable to load admin products" }, 500);
    }
  });
  routes.get("/orders", async (c) => {
    try {
      return c.json({ orders: await dashboard.listOrders() });
    } catch {
      return c.json({ error: "Unable to load admin orders" }, 500);
    }
  });
  routes.get("/search", async (c) => {
    const query = c.req.query("q")?.trim();
    const limit = parseSearchLimit(c.req.query("limit"));
    if (!query || limit === null) return c.json({ error: "Invalid search request" }, 400);
    try {
      return c.json({ results: await dashboard.search({ query, limit }) });
    } catch {
      return c.json({ error: "Unable to search admin records" }, 500);
    }
  });
  return routes;
};
