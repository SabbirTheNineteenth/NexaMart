"use client";

import { useEffect, useReducer, useRef, useState } from "react";
import { cartReducer, initialCart, type CartItem } from "@/features/cart/cart.reducer";
import { cartRemovalPath, toCartItems, type PersistentCartLine } from "@/features/cart/cart-api.utils";
import { deleteJSON, getJSON, patchJSON, postJSON } from "@/lib/api";
import type { CartProduct } from "@/types/catalog";
import type { Account } from "@/types/account";

const key = "nexamart-cart";
const handoffKey = "nexamart-cart-handoff";

export type CartQuantityUpdate = { state: "pending" } | { state: "error"; message: string };
export type CartLoadState = { state: "idle" } | { state: "loading" } | { state: "error"; message: string };
export type CartHandoffState = { state: "idle" } | { state: "migrating" } | { state: "error"; message: string };

type CartAddLine = { productId: string; variantId?: string; quantity: number };

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function guestCartLine(item: CartItem): CartAddLine | undefined {
  const productId = item.productId ?? item.id;
  if (!uuid.test(productId) || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 99) return undefined;
  if (item.variantId !== undefined && !uuid.test(item.variantId)) return undefined;
  return { productId, ...(item.variantId ? { variantId: item.variantId } : {}), quantity: item.quantity };
}

function guestCartLineId(line: CartAddLine) {
  return `${line.productId}::${line.variantId ?? ""}`;
}

export async function migrateGuestCart(items: CartItem[], addLine: (line: CartAddLine) => Promise<void>, completedLineIds = new Set<string>()) {
  for (const item of items) {
    const line = guestCartLine(item);
    if (!line || completedLineIds.has(guestCartLineId(line))) continue;
    await addLine(line);
    completedLineIds.add(guestCartLineId(line));
  }
}

type CartQuantityMutationOptions = {
  authenticated: boolean;
  patchQuantity: (id: string, quantity: number) => Promise<void>;
  dispatch: (action: { type: "setQuantity"; id: string; quantity: number }) => void;
  setUpdate: (id: string, update: CartQuantityUpdate | undefined) => void;
  pendingIds?: Set<string>;
  retryQuantities?: Map<string, number>;
};

export function createCartQuantityMutation({ authenticated, patchQuantity, dispatch, setUpdate, pendingIds = new Set<string>(), retryQuantities = new Map<string, number>() }: CartQuantityMutationOptions) {
  const setQuantity = async (id: string, quantity: number) => {
    if (pendingIds.has(id)) return;
    pendingIds.add(id);
    setUpdate(id, { state: "pending" });
    try {
      if (authenticated) await patchQuantity(id, quantity);
      dispatch({ type: "setQuantity", id, quantity });
      retryQuantities.delete(id);
      setUpdate(id, undefined);
    } catch (reason) {
      retryQuantities.set(id, quantity);
      setUpdate(id, { state: "error", message: reason instanceof Error ? reason.message : "Unable to update this item. Try again." });
      throw reason;
    } finally {
      pendingIds.delete(id);
    }
  };

  return {
    setQuantity,
    retryQuantity: async (id: string) => {
      const quantity = retryQuantities.get(id);
      if (quantity !== undefined) await setQuantity(id, quantity);
    },
  };
}

export function useCart() {
  const [cart, dispatch] = useReducer(cartReducer, initialCart);
  const [hydrated, setHydrated] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [accountRole, setAccountRole] = useState<Account["role"] | null>(null);
  const [cartLoadState, setCartLoadState] = useState<CartLoadState>({ state: "idle" });
  const [cartHandoffState, setCartHandoffState] = useState<CartHandoffState>({ state: "idle" });
  const [removingItemId, setRemovingItemId] = useState<string | null>(null);
  const [quantityUpdates, setQuantityUpdates] = useState<Record<string, CartQuantityUpdate | undefined>>({});
  const pendingQuantityIds = useRef(new Set<string>());
  const retryQuantities = useRef(new Map<string, number>());
  const guestCartItems = useRef<CartItem[] | null>(null);
  const completedGuestLineIds = useRef(new Set<string>());
  const guestCartAccountId = useRef<string | null>(null);

  const loadServerCart = async () => {
    setCartLoadState({ state: "loading" });
    try {
      const { items } = await getJSON<{ items: PersistentCartLine[] }>("/cart/items");
      dispatch({ type: "hydrate", items: toCartItems(items) });
      setCartLoadState({ state: "idle" });
    } catch (reason) {
      setCartLoadState({ state: "error", message: reason instanceof Error ? reason.message : "Unable to load your bag. Try again." });
    }
  };

  const handoffGuestCart = async () => {
    const items = guestCartItems.current;
    if (!items) return true;
    setCartHandoffState({ state: "migrating" });
    try {
      await migrateGuestCart(items, (line) => postJSON<void>("/cart/items", line), completedGuestLineIds.current);
      window.localStorage.removeItem(key);
      window.localStorage.removeItem(handoffKey);
      guestCartItems.current = null;
      completedGuestLineIds.current.clear();
      setCartHandoffState({ state: "idle" });
      return true;
    } catch (reason) {
      if (guestCartAccountId.current) window.localStorage.setItem(handoffKey, JSON.stringify({ accountId: guestCartAccountId.current, completedLineIds: [...completedGuestLineIds.current] }));
      const message = reason instanceof Error ? reason.message : "Unable to move your guest bag. Try again.";
      setCartHandoffState({ state: "error", message });
      setCartLoadState({ state: "error", message });
      return false;
    }
  };

  useEffect(() => {
    const load = async () => {
      const saved = window.localStorage.getItem(key);
      let savedItems: CartItem[] = [];
      if (saved) {
        try {
          const parsed = JSON.parse(saved) as { items?: unknown };
          if (Array.isArray(parsed.items)) savedItems = parsed.items as CartItem[];
        } catch {
          window.localStorage.removeItem(key);
        }
      }
      try {
        const { account } = await getJSON<{ account: Account }>("/auth/me");
        setAuthenticated(true);
        setAccountRole(account.role);
        guestCartItems.current = savedItems;
        guestCartAccountId.current = account.id;
        const savedProgress = window.localStorage.getItem(handoffKey);
        if (savedProgress) try {
          const progress = JSON.parse(savedProgress) as { accountId?: unknown; completedLineIds?: unknown };
          if (progress.accountId === account.id && Array.isArray(progress.completedLineIds) && progress.completedLineIds.every((id) => typeof id === "string")) completedGuestLineIds.current = new Set(progress.completedLineIds);
        } catch { window.localStorage.removeItem(handoffKey); }
        if (await handoffGuestCart()) await loadServerCart();
      } catch {
        dispatch({ type: "hydrate", items: savedItems });
      } finally { setHydrated(true); }
    };
    void load();
  }, []);

  useEffect(() => { if (hydrated && !authenticated) window.localStorage.setItem(key, JSON.stringify(cart)); }, [cart, hydrated, authenticated]);
  const add = async (product: CartProduct, variant?: { id: string; price: number }) => {
    if (authenticated) await postJSON<void>("/cart/items", { productId: product.id, ...(variant ? { variantId: variant.id } : {}), quantity: 1 });
    dispatch({ type: "add", product: variant ? { ...product, id: `${product.id}::${variant.id}`, productId: product.id, variantId: variant.id, price: variant.price, basePrice: variant.price, effectivePrice: variant.price, promotion: undefined } : product });
  };
  const createQuantityMutation = () => createCartQuantityMutation({
    authenticated,
    patchQuantity: (id, quantity) => {
      const item = cart.items.find((candidate) => candidate.id === id);
      return patchJSON<void>(cartRemovalPath(item?.productId ?? item?.id ?? id, item?.variantId), { quantity });
    },
    dispatch,
    setUpdate: (id, update) => setQuantityUpdates((current) => {
      const { [id]: _removed, ...remaining } = current;
      return update ? { ...remaining, [id]: update } : remaining;
    }),
    pendingIds: pendingQuantityIds.current,
    retryQuantities: retryQuantities.current,
  });
  const setQuantity = (id: string, quantity: number) => createQuantityMutation().setQuantity(id, quantity);
  const retryQuantity = (id: string) => createQuantityMutation().retryQuantity(id);
  const remove = async (item: CartItem) => {
    setRemovingItemId(item.id);
    try {
      if (authenticated) await deleteJSON<void>(cartRemovalPath(item.productId ?? item.id, item.variantId));
      dispatch({ type: "remove", id: item.id });
    } finally {
      setRemovingItemId(null);
    }
  };
  const clear = async () => {
    if (authenticated) await deleteJSON<void>("/cart/items");
    dispatch({ type: "clear" });
  };
  const retryCartLoad = async () => {
    if (!authenticated) return;
    if (await handoffGuestCart()) await loadServerCart();
  };
  return { ...cart, add, setQuantity, retryQuantity, remove, clear, authenticated, accountRole, cartLoadState, cartHandoffState, retryCartLoad, removingItemId, quantityUpdates };
}
