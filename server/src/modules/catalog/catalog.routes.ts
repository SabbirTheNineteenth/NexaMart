import { Hono } from "hono";
import { CatalogService } from "./services/catalog-service.js";
import { PostgresCatalogRepository } from "./postgres-catalog.repository.js";
import { PostgresTaxonomyRepository } from "../taxonomy/postgres-taxonomy.repository.js";

type Catalog = Pick<CatalogService, "list" | "bySlug" | "listStores" | "storeBySlug">;

export const createCatalogRoutes = (catalog: Catalog, taxonomy?: { activeOptions(): Promise<unknown> }) => {
  const routes = new Hono();
  routes.get("/products", async (c) => {
    const sort = c.req.query("sort");
    const deals = c.req.query("deals");
    if (sort !== undefined && sort !== "newest") return c.json({ error: "Invalid sort" }, 400);
    if (deals !== undefined && deals !== "active") return c.json({ error: "Invalid deals filter" }, 400);
    try { return c.json(await catalog.list({ query: c.req.query("q"), category: c.req.query("category"), subcategory: c.req.query("subcategory"), brand: c.req.query("brand"), ...(sort ? { sort } : {}), ...(deals ? { deals } : {}) })); }
    catch { return c.json({ error: "Unable to list products" }, 500); }
  });
  routes.get("/products/:slug", async (c) => {
    try {
      const product = await catalog.bySlug(c.req.param("slug"));
      return product ? c.json({ product }) : c.json({ error: "Product not found" }, 404);
    } catch { return c.json({ error: "Unable to retrieve product" }, 500); }
  });
  routes.get("/stores", async (c) => {
    try { return c.json({ stores: await catalog.listStores() }); }
    catch { return c.json({ error: "Unable to list stores" }, 500); }
  });
  routes.get("/stores/:slug", async (c) => {
    try {
      const store = await catalog.storeBySlug(c.req.param("slug"));
      return store ? c.json(store) : c.json({ error: "Store not found" }, 404);
    } catch { return c.json({ error: "Unable to retrieve store" }, 500); }
  });
  if (taxonomy) routes.get("/taxonomy", async (c) => {
    try { return c.json(await taxonomy.activeOptions()); }
    catch { return c.json({ error: "Unable to list taxonomy" }, 500); }
  });
  return routes;
};

export const catalogRoutes = createCatalogRoutes(new CatalogService(new PostgresCatalogRepository()), new PostgresTaxonomyRepository());
