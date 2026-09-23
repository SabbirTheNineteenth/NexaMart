import { Hono, type Context } from "hono";
import { z } from "zod";
import { createAuthGuard, getAuthenticatedAccount } from "../auth/auth.guard.js";
import type { PublicAccount } from "../auth/auth.types.js";
import { TaxonomyValidationError } from "../taxonomy/taxonomy.repository.js";
import { DuplicateGalleryImageError } from "./services/seller-catalog-service.js";

const productSchema = z.object({ name: z.string().min(2).max(180), brand: z.string().trim().min(1).max(120).optional(), slug: z.string().min(2).max(220).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/), description: z.string().min(10), primaryImageUrl: z.string().min(1), price: z.number().positive(), stock: z.number().int().nonnegative(), colors: z.array(z.string().min(1)).max(12), categoryId: z.string().uuid().optional(), subcategoryId: z.string().uuid().optional(), brandId: z.string().uuid().optional() });
const productUpdateSchema = z.object({ name: z.string().trim().min(2).max(180).optional(), brand: z.string().trim().min(1).max(120).optional(), slug: z.string().trim().min(2).max(220).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).optional(), description: z.string().trim().min(10).max(10_000).optional(), price: z.number().finite().positive().max(9_999_999_999.99).optional(), primaryImageUrl: z.string().url().max(2_000).optional(), colors: z.array(z.string().trim().min(1).max(80)).min(1).max(12).refine((colors) => new Set(colors).size === colors.length).optional() }).strict().refine((input) => Object.keys(input).length > 0);
type SellerProductInput = z.infer<typeof productSchema> & { sellerId: string };
const variantSchema = z.object({ sku: z.string().trim().min(1).max(120), options: z.record(z.string().trim().min(1).max(80)).default({}), price: z.number().positive(), stock: z.number().int().nonnegative() });
const variantUpdateSchema = variantSchema.partial().strict().refine((input) => Object.keys(input).length > 0);
const galleryImageSchema = z.object({ imageUrl: z.string().url(), altText: z.string().trim().min(1).max(240).optional(), sortOrder: z.number().int().nonnegative() });
const galleryImageUpdateSchema = galleryImageSchema.partial().strict().refine((input) => Object.keys(input).length > 0);

const isUniqueViolation = (error: unknown) => typeof error === "object" && error !== null && "code" in error && (error as { code?: unknown }).code === "23505";
const notFoundMessage = (error: unknown) => error instanceof Error && ["Product not found", "Variant not found", "Gallery image not found"].includes(error.message) ? error.message : null;
const catalogError = (error: unknown, fallback: string) => { const message = notFoundMessage(error); if (message) return { status: 404 as const, error: message }; if (error instanceof TaxonomyValidationError) return { status: 400 as const, error: error.message }; if (error instanceof Error && error.message === "Product cannot be submitted for review") return { status: 409 as const, error: error.message }; return { status: 500 as const, error: fallback }; };

type SessionResolver = { resolve(token: string): Promise<PublicAccount | null> };
type SellerCatalog = {
  listProducts(sellerId: string): Promise<unknown[]>; createProduct(input: SellerProductInput): Promise<unknown>; updateProduct(input: z.infer<typeof productUpdateSchema> & { sellerId: string; productId: string }): Promise<unknown>; submitForReview(input: { sellerId: string; productId: string }): Promise<unknown>; updateStock(input: { sellerId: string; productId: string; stock: number }): Promise<void>;
  archiveProduct(input: { sellerId: string; productId: string }): Promise<void>;
  createVariant(input: z.infer<typeof variantSchema> & { sellerId: string; productId: string }): Promise<unknown>; listVariants(input: { sellerId: string; productId: string }): Promise<unknown[]>; updateVariant(input: z.infer<typeof variantUpdateSchema> & { sellerId: string; productId: string; variantId: string }): Promise<unknown>; deleteVariant(input: { sellerId: string; productId: string; variantId: string }): Promise<void>;
  createGalleryImage(input: z.infer<typeof galleryImageSchema> & { sellerId: string; productId: string }): Promise<unknown>; listGalleryImages(input: { sellerId: string; productId: string }): Promise<unknown[]>; updateGalleryImage(input: z.infer<typeof galleryImageUpdateSchema> & { sellerId: string; productId: string; imageId: string }): Promise<unknown>; deleteGalleryImage(input: { sellerId: string; productId: string; imageId: string }): Promise<void>;
};
type SellerOrders = { listForSeller(sellerId: string): Promise<unknown[]> };

export const createSellerRoutes = ({ sessions, sellerCatalog, orders }: { sessions: SessionResolver; sellerCatalog: SellerCatalog; orders: SellerOrders }) => {
  const routes = new Hono();
  const guard = createAuthGuard(sessions);
  const respondCatalogError = (c: Context, error: unknown, fallback: string) => {
    const response = catalogError(error, fallback);
    return c.json({ error: response.error }, response.status);
  };

  routes.get("/products", guard.requireAccount, guard.requireRole("seller"), async (c) => {
    try { return c.json({ products: await sellerCatalog.listProducts(getAuthenticatedAccount(c)!.id) }); }
    catch (error) { return respondCatalogError(c, error, "Unable to list products"); }
  });
  routes.get("/orders", guard.requireAccount, guard.requireRole("seller"), async (c) => {
    try { return c.json({ orders: await orders.listForSeller(getAuthenticatedAccount(c)!.id) }); }
    catch { return c.json({ error: "Unable to load seller orders" }, 500); }
  });
  routes.get("/products/:productId/variants", guard.requireAccount, guard.requireRole("seller"), async (c) => {
    try { return c.json({ variants: await sellerCatalog.listVariants({ sellerId: getAuthenticatedAccount(c)!.id, productId: c.req.param("productId") }) }); }
    catch (error) { return respondCatalogError(c, error, "Unable to list variants"); }
  });
  routes.post("/products/:productId/variants", guard.requireAccount, guard.requireRole("seller"), async (c) => {
    const parsed = variantSchema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return c.json({ error: "Invalid variant" }, 400);
    try { const variant = await sellerCatalog.createVariant({ sellerId: getAuthenticatedAccount(c)!.id, productId: c.req.param("productId"), ...parsed.data }); return c.json({ variant }, 201); }
    catch (error) { if (isUniqueViolation(error)) return c.json({ error: "Variant SKU already exists" }, 409); return respondCatalogError(c, error, "Unable to create variant"); }
  });
  routes.patch("/products/:productId/variants/:variantId", guard.requireAccount, guard.requireRole("seller"), async (c) => {
    const parsed = variantUpdateSchema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return c.json({ error: "Invalid variant update" }, 400);
    try { const variant = await sellerCatalog.updateVariant({ sellerId: getAuthenticatedAccount(c)!.id, productId: c.req.param("productId"), variantId: c.req.param("variantId"), ...parsed.data }); return c.json({ variant }); }
    catch (error) { if (isUniqueViolation(error)) return c.json({ error: "Variant SKU already exists" }, 409); return respondCatalogError(c, error, "Unable to update variant"); }
  });
  routes.delete("/products/:productId/variants/:variantId", guard.requireAccount, guard.requireRole("seller"), async (c) => {
    try { await sellerCatalog.deleteVariant({ sellerId: getAuthenticatedAccount(c)!.id, productId: c.req.param("productId"), variantId: c.req.param("variantId") }); return c.body(null, 204); }
    catch (error) { return respondCatalogError(c, error, "Unable to delete variant"); }
  });
  routes.get("/products/:productId/gallery-images", guard.requireAccount, guard.requireRole("seller"), async (c) => {
    try { return c.json({ images: await sellerCatalog.listGalleryImages({ sellerId: getAuthenticatedAccount(c)!.id, productId: c.req.param("productId") }) }); }
    catch (error) { return respondCatalogError(c, error, "Unable to list gallery images"); }
  });
  routes.post("/products/:productId/gallery-images", guard.requireAccount, guard.requireRole("seller"), async (c) => {
    const parsed = galleryImageSchema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return c.json({ error: "Invalid gallery image" }, 400);
    try { const image = await sellerCatalog.createGalleryImage({ sellerId: getAuthenticatedAccount(c)!.id, productId: c.req.param("productId"), ...parsed.data }); return c.json({ image }, 201); }
    catch (error) { if (error instanceof DuplicateGalleryImageError) return c.json({ error: error.message }, 409); if (isUniqueViolation(error)) return c.json({ error: "Gallery image position already exists" }, 409); return respondCatalogError(c, error, "Unable to create gallery image"); }
  });
  routes.patch("/products/:productId/gallery-images/:imageId", guard.requireAccount, guard.requireRole("seller"), async (c) => {
    const parsed = galleryImageUpdateSchema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return c.json({ error: "Invalid gallery image update" }, 400);
    try { const image = await sellerCatalog.updateGalleryImage({ sellerId: getAuthenticatedAccount(c)!.id, productId: c.req.param("productId"), imageId: c.req.param("imageId"), ...parsed.data }); return c.json({ image }); }
    catch (error) { if (error instanceof DuplicateGalleryImageError) return c.json({ error: error.message }, 409); if (isUniqueViolation(error)) return c.json({ error: "Gallery image position already exists" }, 409); return respondCatalogError(c, error, "Unable to update gallery image"); }
  });
  routes.delete("/products/:productId/gallery-images/:imageId", guard.requireAccount, guard.requireRole("seller"), async (c) => {
    try { await sellerCatalog.deleteGalleryImage({ sellerId: getAuthenticatedAccount(c)!.id, productId: c.req.param("productId"), imageId: c.req.param("imageId") }); return c.body(null, 204); }
    catch (error) { return respondCatalogError(c, error, "Unable to delete gallery image"); }
  });

  routes.patch("/products/:productId/stock", guard.requireAccount, guard.requireRole("seller"), async (c) => {
    const parsed = z.object({ stock: z.number().int().nonnegative() }).safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return c.json({ error: "Invalid stock" }, 400);
    try { await sellerCatalog.updateStock({ sellerId: getAuthenticatedAccount(c)!.id, productId: c.req.param("productId"), stock: parsed.data.stock }); return c.body(null, 204); }
    catch (error) { return respondCatalogError(c, error, "Unable to update stock"); }
  });
  routes.patch("/products/:productId", guard.requireAccount, guard.requireRole("seller"), async (c) => {
    const parsed = productUpdateSchema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return c.json({ error: "Invalid product update" }, 400);
    try { const product = await sellerCatalog.updateProduct({ sellerId: getAuthenticatedAccount(c)!.id, productId: c.req.param("productId"), ...parsed.data }); return c.json({ product }); }
    catch (error) { if (isUniqueViolation(error)) return c.json({ error: "Product slug already exists" }, 409); return respondCatalogError(c, error, "Unable to update product"); }
  });
  routes.delete("/products/:productId", guard.requireAccount, guard.requireRole("seller"), async (c) => {
    try { await sellerCatalog.archiveProduct({ sellerId: getAuthenticatedAccount(c)!.id, productId: c.req.param("productId") }); return c.body(null, 204); }
    catch (error) { return respondCatalogError(c, error, "Unable to archive product"); }
  });
  routes.post("/products/:productId/submit-for-review", guard.requireAccount, guard.requireRole("seller"), async (c) => {
    try { return c.json({ product: await sellerCatalog.submitForReview({ sellerId: getAuthenticatedAccount(c)!.id, productId: c.req.param("productId") }) }); }
    catch (error) { return respondCatalogError(c, error, "Unable to submit product for review"); }
  });
  routes.post("/products", guard.requireAccount, guard.requireRole("seller"), async (c) => {
    const parsed = productSchema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return c.json({ error: "Invalid product" }, 400);
    try { const product = await sellerCatalog.createProduct({ sellerId: getAuthenticatedAccount(c)!.id, ...parsed.data }); return c.json({ product }, 201); }
    catch (error) { if (isUniqueViolation(error)) return c.json({ error: "Product slug already exists" }, 409); return respondCatalogError(c, error, "Unable to create product"); }
  });
  return routes;
};
