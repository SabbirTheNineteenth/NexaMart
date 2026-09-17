import { Hono } from "hono";
import { z } from "zod";
import { createAuthGuard, getAuthenticatedAccount } from "../auth/auth.guard.js";
import type { PublicAccount } from "../auth/auth.types.js";
import type { Address, AddressInput, AddressUpdateInput } from "./address.repository.js";

const optionalAddressField = (max: number) => z.string().trim().max(max).transform((value) => value || undefined).optional();
const optionalAddressUpdateField = (max: number) => z.string().trim().max(max).transform((value) => value || null).nullable().optional();
const addressObject = z.object({ recipientName: z.string().trim().min(2).max(120), phone: z.string().trim().min(5).max(32), line1: z.string().trim().min(2).max(180), line2: optionalAddressField(180), city: z.string().trim().min(2).max(120), region: optionalAddressField(120), postalCode: optionalAddressField(24), country: z.string().trim().length(2).transform((country) => country.toUpperCase()) });
const addressUpdateObject = z.object({ recipientName: z.string().trim().min(2).max(120).optional(), phone: z.string().trim().min(5).max(32).optional(), line1: z.string().trim().min(2).max(180).optional(), line2: optionalAddressUpdateField(180), city: z.string().trim().min(2).max(120).optional(), region: optionalAddressUpdateField(120), postalCode: optionalAddressUpdateField(24), country: z.string().trim().length(2).transform((country) => country.toUpperCase()).optional() });
const withoutUndefined = <T extends Record<string, unknown>>(input: T) => Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined)) as T;
const addressSchema = addressObject.transform(withoutUndefined);
const addressUpdateSchema = addressUpdateObject.strict().refine((input) => Object.keys(input).length > 0).transform(withoutUndefined);
type SessionResolver = { resolve(token: string): Promise<PublicAccount | null> };
type AddressActions = { create(input: AddressInput & { accountId: string }): Promise<Address>; list(accountId: string): Promise<Address[]>; update(input: AddressUpdateInput & { accountId: string; addressId: string }): Promise<Address | null>; selectDefault(input: { accountId: string; addressId: string }): Promise<Address | null>; remove(input: { accountId: string; addressId: string }): Promise<void> };

export const createAddressRoutes = ({ sessions, addresses }: { sessions: SessionResolver; addresses: AddressActions }) => {
  const routes = new Hono();
  const guard = createAuthGuard(sessions);
  routes.get("/", guard.requireAccount, guard.requireRole("customer"), async (c) => {
    try { return c.json({ addresses: await addresses.list(getAuthenticatedAccount(c)!.id) }); }
    catch { return c.json({ error: "Unable to list addresses" }, 500); }
  });
  routes.post("/", guard.requireAccount, guard.requireRole("customer"), async (c) => {
    const parsed = addressSchema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return c.json({ error: "Invalid address" }, 400);
    try { return c.json({ address: await addresses.create({ accountId: getAuthenticatedAccount(c)!.id, ...parsed.data }) }, 201); }
    catch { return c.json({ error: "Unable to create address" }, 500); }
  });
  routes.patch("/:addressId/default", guard.requireAccount, guard.requireRole("customer"), async (c) => {
    const addressId = z.string().uuid().safeParse(c.req.param("addressId"));
    if (!addressId.success) return c.json({ error: "Invalid address" }, 400);
    let address: Address | null;
    try { address = await addresses.selectDefault({ accountId: getAuthenticatedAccount(c)!.id, addressId: addressId.data }); }
    catch { return c.json({ error: "Unable to select default address" }, 500); }
    if (!address) return c.json({ error: "Address not found" }, 404);
    return c.json({ address });
  });
  routes.patch("/:addressId", guard.requireAccount, guard.requireRole("customer"), async (c) => {
    const addressId = z.string().uuid().safeParse(c.req.param("addressId"));
    const parsed = addressUpdateSchema.safeParse(await c.req.json().catch(() => null));
    if (!addressId.success || !parsed.success) return c.json({ error: "Invalid address" }, 400);
    let address: Address | null;
    try {
      address = await addresses.update({ accountId: getAuthenticatedAccount(c)!.id, addressId: addressId.data, ...parsed.data });
    }
    catch { return c.json({ error: "Unable to update address" }, 500); }
    if (!address) return c.json({ error: "Address not found" }, 404);
    return c.json({ address });
  });
  routes.delete("/:addressId", guard.requireAccount, guard.requireRole("customer"), async (c) => {
    const addressId = z.string().uuid().safeParse(c.req.param("addressId"));
    if (!addressId.success) return c.json({ error: "Invalid address" }, 400);
    try { await addresses.remove({ accountId: getAuthenticatedAccount(c)!.id, addressId: addressId.data }); }
    catch { return c.json({ error: "Unable to remove address" }, 500); }
    return c.body(null, 204);
  });
  return routes;
};
